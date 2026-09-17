/**
 * Pure decisions of the O(1) Bearer phases: waiting for the audience count and creating
 * or reconciling the campaign. The orchestrator only runs the calls and persists the job
 * these functions return.
 */

import type { CallResult, HttpCall } from '../../../core/call-executor';
import type { StopCause } from './call-failures';
import type { DispatchJob, JobFailure, ResumePhase } from './types';
import { classifyCallFailures, payloadOf, rejectedTokenStrategy, truncateDetail } from './call-failures';
import { dispatchName, findCampaignByName, readAudienceCount } from './campaign';
import { CALL_RETRY_DELAY_MS, CAMPAIGN_FANOUT_DELAY_MS, MAX_CALL_ATTEMPTS, RECONCILIATION_DELAY_MS } from './constants';
import { UnexpectedPayloadError } from './errors';
import { toCreatedId } from './payloads';
import { requireAudienceDeadline, requireAudienceSize } from './requirements';
import { toCampaignCompleted, toCampaignUnverified, toFailed, toSending, tokenRejectedReason } from './job-machine';

/**
 * Next move after a Bearer phase call:
 * - `advanced`: the job moved on (or failed) and is persisted as returned.
 * - `wait`: nothing changed but bookkeeping; try again after the phase's delay.
 * - `stop`: the gateway throttled or the network failed; persist the job and cool down.
 */
export type SendPhaseResolution =
    | { kind: 'advanced'; job: DispatchJob }
    | { kind: 'wait'; job: DispatchJob }
    | { kind: 'stop'; cause: StopCause; job: DispatchJob };

/**
 * Applies an audience count. A rejected token fails the job. An outcome the count does not
 * reveal (any 5xx, including the transient one the report engine answers while the new
 * segmentation has not propagated, or a lost request) and a count below the audience wait
 * until the deadline, which fails with `audience_timeout`. An equal count moves to
 * `sending`; a larger one fails with `audience_mismatch`. A throttled or interrupted wave
 * cools down, unless the deadline has passed.
 *
 * @throws UnexpectedPayloadError when the count is refused (a 4xx other than a refused
 *   token) or answers a 2xx without a numeric count, so nothing is sent on a surprise.
 */
export function resolveAudienceCount(job: DispatchJob, call: HttpCall, result: CallResult, now: number): SendPhaseResolution {
    const failure = classifyCallFailures([result]);

    if (failure?.kind === 'tokenRejected') {
        return { kind: 'advanced', job: toFailed(job, tokenRejectedFailure([call], [result], 'audience count', 'awaitingAudience'), now) };
    }

    if (failure?.kind === 'rejected') {
        throw new UnexpectedPayloadError('audience count', `refused with ${failure.failure.status}: ${failure.failure.detail}`);
    }

    if (failure?.kind === 'stopBlock') {
        return pastAudienceDeadline(job, now)
            ? { kind: 'advanced', job: audienceTimedOut(job, now) }
            : { kind: 'stop', cause: failure.cause, job };
    }

    if (failure) {
        return waitForAudience(job, job.lastAudienceCount, now);
    }

    const audienceSize = requireAudienceSize(job);
    const count = readAudienceCount(result);

    if (count === audienceSize) {
        return { kind: 'advanced', job: toSending(job, count, now) };
    }

    if (count > audienceSize) {
        return {
            kind: 'advanced',
            job: toFailed({ ...job, lastAudienceCount: count }, { reason: 'audience_mismatch', detail: `audience counts ${count}, expected ${audienceSize}`, resumePhase: 'awaitingAudience' }, now),
        };
    }

    return waitForAudience(job, count, now);
}

/** The job with the campaign write-ahead marker, persisted before the campaign POST. */
export function withCampaignInFlight(job: DispatchJob, now: number): DispatchJob {
    return { ...job, campaignSendState: 'inFlight', campaignReconcileAttempts: 0, updatedAt: now };
}

/**
 * Applies the campaign creation. A 2xx takes only the created campaign's id from the
 * response and schedules the read that carries its audience quantity: Hablla answers the
 * creation before resolving the audience (proved live, `quantity: 0` in the 201 body), so
 * nothing about the audience is concluded from it. A throttled call was not processed and
 * clears the marker. A refused token or another 4xx clears the marker and fails the job. A
 * 5xx, a transport failure or an interrupted wave leave the outcome unknown: the marker
 * stays and a reconciliation by name is scheduled.
 */
export function resolveCampaignCreation(job: DispatchJob, call: HttpCall, result: CallResult, now: number): SendPhaseResolution {
    const failure = classifyCallFailures([result]);

    switch (failure?.kind) {
        case undefined:
            return { kind: 'wait', job: withCampaignSent(job, toCreatedId(payloadOf(result), 'campaign'), now) };
        case 'stopBlock':
            if (failure.cause === 'throttled') {
                return { kind: 'stop', cause: 'throttled', job: withoutCampaignInFlight(job, now) };
            }
            return { kind: 'stop', cause: 'interrupted', job: withCampaignReconcileAt(job, now + RECONCILIATION_DELAY_MS, now) };
        case 'tokenRejected':
            return { kind: 'advanced', job: toFailed(withoutCampaignInFlight(job, now), tokenRejectedFailure([call], [result], 'campaign creation', 'sending'), now) };
        case 'rejected':
            return { kind: 'advanced', job: toFailed(withoutCampaignInFlight(job, now), { reason: 'campaign_rejected', detail: failure.failure.detail, resumePhase: 'sending' }, now) };
        case 'outcomeUnknown':
            return { kind: 'wait', job: withCampaignReconcileAt(job, now + RECONCILIATION_DELAY_MS, now) };
    }
}

/**
 * Applies the campaign read by the dispatch's unique name, which both markers need. Under
 * `inFlight` it answers whether the POST created the campaign: found completes the job with
 * the quantity the campaign reports and not found clears the marker and fails with
 * `campaign_rejected` (a `start` sends again). Under `sent` it answers only the audience
 * quantity of a campaign that already exists, so a read that does not resolve is retried
 * and then completed as unverified — the campaign is never sent a second time. A refused
 * token fails the job and keeps the marker.
 */
export function resolveCampaignReconciliation(job: DispatchJob, call: HttpCall, result: CallResult, now: number): SendPhaseResolution {
    const failure = classifyCallFailures([result]);

    switch (failure?.kind) {
        case undefined: {
            const campaign = findCampaignByName(result, dispatchName(job));

            if (campaign) {
                return { kind: 'advanced', job: toCampaignCompleted(job, campaign, now) };
            }

            if (job.campaignSendState === 'sent') {
                return retryCampaignRead(job, 'campaign not listed by its name', now);
            }

            return { kind: 'advanced', job: toFailed(withoutCampaignInFlight(job, now), { reason: 'campaign_rejected', detail: 'not created', resumePhase: 'sending' }, now) };
        }
        case 'stopBlock':
            return { kind: 'stop', cause: failure.cause, job };
        case 'tokenRejected':
            return { kind: 'advanced', job: toFailed(job, tokenRejectedFailure([call], [result], 'campaign read', 'sending'), now) };
        case 'rejected':
        case 'outcomeUnknown':
            return retryCampaignRead(job, truncateDetail(failure.failure.detail), now);
    }
}

/**
 * Retries the campaign read after `CALL_RETRY_DELAY_MS`. Once `MAX_CALL_ATTEMPTS` are
 * spent, a campaign already created completes as unverified, and one whose POST outcome is
 * still unknown fails with `campaign_outcome_unknown`, keeping the marker so a resume reads
 * again and never re-sends blindly.
 */
function retryCampaignRead(job: DispatchJob, detail: string, now: number): SendPhaseResolution {
    const attempts = (job.campaignReconcileAttempts ?? 0) + 1;

    if (attempts < MAX_CALL_ATTEMPTS) {
        return { kind: 'wait', job: { ...withCampaignReconcileAt(job, now + CALL_RETRY_DELAY_MS, now), campaignReconcileAttempts: attempts } };
    }

    const spent: DispatchJob = { ...job, campaignReconcileAttempts: 0 };

    return job.campaignSendState === 'sent'
        ? { kind: 'advanced', job: toCampaignUnverified(spent, detail, now) }
        : { kind: 'advanced', job: toFailed(spent, { reason: 'campaign_outcome_unknown', detail, resumePhase: 'sending' }, now) };
}

/** The job failure of a phase whose call had its token refused, naming the token the route used. */
function tokenRejectedFailure(calls: readonly HttpCall[], results: readonly CallResult[], step: string, resumePhase: ResumePhase): JobFailure {
    const strategy = rejectedTokenStrategy(calls, results);

    return { reason: tokenRejectedReason(strategy), detail: `${step} refused the ${strategy} token`, resumePhase };
}

/** Waits for the audience with the last count known, or fails with `audience_timeout` past the deadline. */
function waitForAudience(job: DispatchJob, lastAudienceCount: number | undefined, now: number): SendPhaseResolution {
    const waiting: DispatchJob = { ...job, lastAudienceCount, updatedAt: now };

    return pastAudienceDeadline(job, now)
        ? { kind: 'advanced', job: audienceTimedOut(waiting, now) }
        : { kind: 'wait', job: waiting };
}

/** The job failed because the audience never matched inside its deadline. */
function audienceTimedOut(job: DispatchJob, now: number): DispatchJob {
    const lastCount = job.lastAudienceCount === undefined ? 'never resolved' : String(job.lastAudienceCount);

    return toFailed(job, { reason: 'audience_timeout', detail: `audience not ready: last count ${lastCount}, expected ${requireAudienceSize(job)}`, resumePhase: 'awaitingAudience' }, now);
}

/** True once the audience wait ran out of time. */
function pastAudienceDeadline(job: DispatchJob, now: number): boolean {
    return now >= requireAudienceDeadline(job);
}

/** True when the in-flight campaign may be reconciled now. */
export function isCampaignReconcileDue(job: DispatchJob, now: number): boolean {
    return job.campaignReconcileNotBefore === undefined || job.campaignReconcileNotBefore <= now;
}

/** The job with its campaign marker kept and the next campaign read scheduled. */
function withCampaignReconcileAt(job: DispatchJob, readAt: number, now: number): DispatchJob {
    return { ...job, campaignReconcileNotBefore: readAt, updatedAt: now };
}

/** The job with the campaign created and the read of its audience quantity scheduled. */
function withCampaignSent(job: DispatchJob, campaignId: string, now: number): DispatchJob {
    return { ...withCampaignReconcileAt(job, now + CAMPAIGN_FANOUT_DELAY_MS, now), campaignSendState: 'sent', campaignId, campaignReconcileAttempts: 0 };
}

/** The job with the campaign marker cleared. */
export function withoutCampaignInFlight(job: DispatchJob, now: number): DispatchJob {
    return { ...job, campaignSendState: undefined, campaignReconcileNotBefore: undefined, campaignReconcileAttempts: undefined, updatedAt: now };
}
