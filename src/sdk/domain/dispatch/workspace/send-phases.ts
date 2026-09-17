/**
 * Pure decisions of the O(1) Bearer phases: waiting for the audience count and creating
 * or reconciling the campaign. The orchestrator only runs the calls and persists the job
 * these functions return.
 */

import type { CallResult } from '../../../core/call-executor';
import type { StopCause } from './call-failures';
import type { DispatchJob } from './types';
import { classifyCallFailures, payloadOf, truncateDetail } from './call-failures';
import { dispatchName, findCampaignByName, isAudienceNotPropagated, readAudienceCount } from './campaign';
import { CALL_RETRY_DELAY_MS, MAX_CALL_ATTEMPTS, RECONCILIATION_DELAY_MS } from './constants';
import { toCampaignSummary } from './payloads';
import { requireAudienceSize, toCompleted, toFailed, toSending } from './job-machine';

/** The strategy every call of these phases is pinned to. */
const SEND_PHASE_STRATEGY = 'bearer';

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
 * Applies an audience count. A throttled or failed network call stops; a rejected token
 * fails the job; the known not-propagated 500 or a smaller count waits (until the
 * deadline, which fails with `audience_timeout`); an equal count moves to `sending`; a
 * larger count fails with `audience_mismatch`.
 *
 * @throws UnexpectedPayloadError for any other status or payload, so nothing is sent on a surprise.
 */
export function resolveAudienceCount(job: DispatchJob, result: CallResult, now: number): SendPhaseResolution {
    const audienceSize = requireAudienceSize(job);
    const failure = classifyCallFailures([result], SEND_PHASE_STRATEGY);

    if (failure?.kind === 'stopBlock') {
        return { kind: 'stop', cause: failure.cause, job };
    }

    if (failure?.kind === 'tokenRejected') {
        return { kind: 'advanced', job: toFailed(job, { reason: 'bearer_token_rejected', detail: 'audience count refused the Bearer token', resumePhase: 'awaitingAudience' }, now) };
    }

    if (result.kind === 'transportFailed') {
        return { kind: 'stop', cause: 'interrupted', job };
    }

    const count = isAudienceNotPropagated(result) ? undefined : readAudienceCount(result);

    if (count === audienceSize) {
        return { kind: 'advanced', job: toSending(job, count, now) };
    }

    if (count !== undefined && count > audienceSize) {
        return {
            kind: 'advanced',
            job: toFailed({ ...job, lastAudienceCount: count }, { reason: 'audience_mismatch', detail: `audience counts ${count}, expected ${audienceSize}`, resumePhase: 'awaitingAudience' }, now),
        };
    }

    const waiting: DispatchJob = { ...job, lastAudienceCount: count ?? job.lastAudienceCount, updatedAt: now };

    if (now >= requireAudienceDeadline(job)) {
        const lastCount = waiting.lastAudienceCount === undefined ? 'never resolved' : String(waiting.lastAudienceCount);

        return {
            kind: 'advanced',
            job: toFailed(waiting, { reason: 'audience_timeout', detail: `audience not ready: last count ${lastCount}, expected ${audienceSize}`, resumePhase: 'awaitingAudience' }, now),
        };
    }

    return { kind: 'wait', job: waiting };
}

/** The job with the campaign write-ahead marker, persisted before the campaign POST. */
export function withCampaignInFlight(job: DispatchJob, now: number): DispatchJob {
    return { ...job, campaignSendState: 'inFlight', campaignReconcileAttempts: 0, updatedAt: now };
}

/**
 * Applies the campaign creation. A 2xx completes the job. A throttled call was not
 * processed and clears the marker. A refused token or another 4xx clears the marker and
 * fails the job. A 5xx, a transport failure or an interrupted wave leave the outcome
 * unknown: the marker stays and a reconciliation by name is scheduled.
 */
export function resolveCampaignCreation(job: DispatchJob, result: CallResult, now: number): SendPhaseResolution {
    const failure = classifyCallFailures([result], SEND_PHASE_STRATEGY);

    switch (failure?.kind) {
        case undefined: {
            const campaign = toCampaignSummary(payloadOf(result));
            return { kind: 'advanced', job: toCompleted(job, now, campaign) };
        }
        case 'stopBlock':
            if (failure.cause === 'throttled') {
                return { kind: 'stop', cause: 'throttled', job: withoutCampaignInFlight(job, now) };
            }
            return { kind: 'stop', cause: 'interrupted', job: withCampaignReconcileAt(job, now + RECONCILIATION_DELAY_MS, now) };
        case 'tokenRejected':
            return { kind: 'advanced', job: toFailed(withoutCampaignInFlight(job, now), { reason: 'bearer_token_rejected', detail: 'campaign creation refused the Bearer token', resumePhase: 'sending' }, now) };
        case 'rejected':
            return { kind: 'advanced', job: toFailed(withoutCampaignInFlight(job, now), { reason: 'campaign_rejected', detail: failure.failure.detail, resumePhase: 'sending' }, now) };
        case 'outcomeUnknown':
            return { kind: 'wait', job: withCampaignReconcileAt(job, now + RECONCILIATION_DELAY_MS, now) };
    }
}

/**
 * Applies the reconciliation of an in-flight campaign by its unique name. Found completes
 * the job; not found clears the marker and fails with `campaign_rejected` (a `start` sends
 * again). A refused token fails the job and keeps the marker. Unknown outcomes retry after
 * `CALL_RETRY_DELAY_MS` and, after `MAX_CALL_ATTEMPTS`, fail with
 * `campaign_outcome_unknown`, still keeping the marker so a resume reconciles again and
 * never re-sends blindly.
 */
export function resolveCampaignReconciliation(job: DispatchJob, result: CallResult, now: number): SendPhaseResolution {
    const failure = classifyCallFailures([result], SEND_PHASE_STRATEGY);

    switch (failure?.kind) {
        case undefined: {
            const campaign = findCampaignByName(result, dispatchName(job));

            if (campaign) {
                return { kind: 'advanced', job: toCompleted(job, now, campaign) };
            }

            return { kind: 'advanced', job: toFailed(withoutCampaignInFlight(job, now), { reason: 'campaign_rejected', detail: 'not created', resumePhase: 'sending' }, now) };
        }
        case 'stopBlock':
            return { kind: 'stop', cause: failure.cause, job };
        case 'tokenRejected':
            return { kind: 'advanced', job: toFailed(job, { reason: 'bearer_token_rejected', detail: 'campaign reconciliation refused the Bearer token', resumePhase: 'sending' }, now) };
        case 'rejected':
        case 'outcomeUnknown': {
            const attempts = (job.campaignReconcileAttempts ?? 0) + 1;

            if (attempts >= MAX_CALL_ATTEMPTS) {
                return {
                    kind: 'advanced',
                    job: toFailed({ ...job, campaignReconcileAttempts: 0 }, { reason: 'campaign_outcome_unknown', detail: truncateDetail(failure.failure.detail), resumePhase: 'sending' }, now),
                };
            }

            return { kind: 'wait', job: { ...withCampaignReconcileAt(job, now + CALL_RETRY_DELAY_MS, now), campaignReconcileAttempts: attempts } };
        }
    }
}

/** True when the in-flight campaign may be reconciled now. */
export function isCampaignReconcileDue(job: DispatchJob, now: number): boolean {
    return job.campaignReconcileNotBefore === undefined || job.campaignReconcileNotBefore <= now;
}

/** The job with the campaign marker kept and a reconciliation scheduled. */
function withCampaignReconcileAt(job: DispatchJob, reconcileAt: number, now: number): DispatchJob {
    return { ...job, campaignSendState: 'inFlight', campaignReconcileNotBefore: reconcileAt, updatedAt: now };
}

/** The job with the campaign marker cleared. */
function withoutCampaignInFlight(job: DispatchJob, now: number): DispatchJob {
    return { ...job, campaignSendState: undefined, campaignReconcileNotBefore: undefined, campaignReconcileAttempts: undefined, updatedAt: now };
}

/**
 * The audience deadline, set when the job entered or resumed `awaitingAudience`.
 *
 * @throws Error when absent (a planning bug).
 */
function requireAudienceDeadline(job: DispatchJob): number {
    if (job.audienceDeadlineAt === undefined) {
        throw new Error(`Dispatch job ${job.id} has no audience deadline`);
    }

    return job.audienceDeadlineAt;
}
