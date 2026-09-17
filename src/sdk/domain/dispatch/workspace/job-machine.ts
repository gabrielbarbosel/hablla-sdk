/**
 * The pure state machine of a dispatch job: creation, duplicate verdicts, outcome
 * counts, the chunk cursor and passes, phase transitions and the next step for callers.
 */

import type { CallResult, HttpCall } from '../../../core/call-executor';
import type { AuthStrategy } from '../../../core/strategy';
import type { PreparedAudience } from './audience';
import type { StopCause } from './call-failures';
import type {
    ChunkedPhase,
    ContactOutcome,
    LookupPurpose,
    ResumePhase,
    DispatchContact,
    DispatchJob,
    DispatchJobPhase,
    DispatchNextStep,
    JobFailure,
    JobFailureReason,
    WorkspaceDispatchRequest,
} from './types';
import { excludesByFilter } from './audience';
import { rejectedTokenStrategy } from './call-failures';
import { toDispatchConfig } from './campaign';
import { AUDIENCE_POLL_INTERVAL_MS, AUDIENCE_READY_TIMEOUT_MS, FIRST_EXCLUSION_PAGE, INTERRUPTED_ROUNDS_BEFORE_ATTEMPT, THROTTLE_COOLDOWN_MS, TRANSPORT_COOLDOWN_MS } from './constants';
import { workOutcomeOf } from './contact-step';
import { InvalidJobTransitionError } from './errors';
import { jobIdOf } from './job-id';
import { requireAudienceSize, requireExclusionCursor, requireExclusionPurpose } from './requirements';
import { CONTACT_OUTCOMES, RESUMABLE_PHASES } from './types';

/** Phases in which the job is over. */
const TERMINAL_PHASES: readonly DispatchJobPhase[] = ['completed', 'superseded', 'abandoned'];

/** Why a call returned early, as `nextStepOf` understands it. */
export type EarlyStop = { cause: StopCause } | { waitUntil: number };

/** What `plan` must do given the jobs that share the fingerprint. */
export type DuplicateVerdict =
    | { kind: 'create'; supersede: DispatchJob[] }
    | { kind: 'refuse'; job: DispatchJob }
    | { kind: 'busy'; job: DispatchJob };

/** Counts with every outcome at zero. */
export function emptyCounts(): Record<ContactOutcome, number> {
    return Object.fromEntries(CONTACT_OUTCOMES.map((outcome) => [outcome, 0])) as Record<ContactOutcome, number>;
}

/** Counts of the contacts' outcomes. */
export function countOutcomes(contacts: readonly DispatchContact[]): Record<ContactOutcome, number> {
    const counts = emptyCounts();

    for (const contact of contacts) {
        counts[contact.outcome]++;
    }

    return counts;
}

/** Counts after contacts changed from `before` to `after` (aligned by position). */
export function tallyOutcomes(counts: Readonly<Record<ContactOutcome, number>>, before: readonly DispatchContact[], after: readonly DispatchContact[]): Record<ContactOutcome, number> {
    const tallied = { ...counts };

    before.forEach((previous, position) => {
        const current = after[position]!;
        tallied[previous.outcome]--;
        tallied[current.outcome]++;
    });

    return tallied;
}

/**
 * A new job at revision 0: `resolvingExclusions` when the request excludes by filter,
 * `resolving` when it does not, or `awaitingConfirmation` when no contact needs a lookup.
 */
export function createJob(prepared: PreparedAudience, request: WorkspaceDispatchRequest, now: number): DispatchJob {
    const { rows: _rows, exclusion, ...settings } = request;
    const firstPending = prepared.contacts.find((contact) => contact.outcome === 'pendingLookup');
    const job: DispatchJob = {
        id: jobIdOf(prepared.fingerprint, now),
        revision: 0,
        fingerprint: prepared.fingerprint,
        settings,
        exclusion: { phoneCount: exclusion.phones.length, segmentationFilters: exclusion.segmentationFilters },
        phase: firstPending ? 'resolving' : 'awaitingConfirmation',
        createdAt: now,
        updatedAt: now,
        contactCount: prepared.contacts.length,
        cursor: firstPending?.index ?? 0,
        pass: 0,
        counts: countOutcomes(prepared.contacts),
        revalidationShifts: {},
        consecutiveInterruptedRounds: 0,
        warnings: [],
    };

    return firstPending && excludesByFilter(exclusion) ? withExclusionRun(job, 'preview', now) : job;
}

/** The job at the first page of an exclusion run, the phase that precedes both the preview and the writes. */
function withExclusionRun(job: DispatchJob, purpose: LookupPurpose, now: number): DispatchJob {
    return {
        ...job,
        phase: 'resolvingExclusions',
        exclusionPurpose: purpose,
        exclusionCursor: FIRST_EXCLUSION_PAGE,
        exclusionAttempts: 0,
        updatedAt: now,
    };
}

/**
 * Verdict over the other jobs with the same fingerprint. A job not yet started is
 * superseded when idle and makes `plan` busy while leased; a started or failed job
 * refuses. Among the completed jobs only the latest one that actually sent a campaign
 * counts, and it refuses unless {@link confirmsLatestSend} recognizes the confirmation, so a
 * chain of confirmed repeats stays possible. Superseded and abandoned jobs, and completed
 * jobs older than the latest send, are ignored.
 */
export function duplicateVerdict(existing: readonly DispatchJob[], repeatOfJobId: string | undefined, now: number): DuplicateVerdict {
    const supersede: DispatchJob[] = [];
    let busy: DispatchJob | undefined;
    const takeIdle = (job: DispatchJob): void => {
        if (isLeased(job, now)) {
            busy ??= job;
        } else {
            supersede.push(job);
        }
    };

    for (const job of existing) {
        switch (job.phase) {
            case 'resolvingExclusions':
                if (isConfirmed(job)) {
                    return { kind: 'refuse', job };
                }

                takeIdle(job);
                break;
            case 'resolving':
            case 'awaitingConfirmation':
                takeIdle(job);
                break;
            case 'materializing':
            case 'awaitingAudience':
            case 'sending':
            case 'failed':
                return { kind: 'refuse', job };
            case 'completed':
            case 'superseded':
            case 'abandoned':
                break;
        }
    }

    const latestSent = latestSentJob(existing);

    if (latestSent && !confirmsLatestSend(existing, repeatOfJobId, latestSent)) {
        return { kind: 'refuse', job: latestSent };
    }

    return busy ? { kind: 'busy', job: busy } : { kind: 'create', supersede };
}

/** True once an operator confirmed the job, so it may already have written to Hablla. */
export function isConfirmed(job: DispatchJob): boolean {
    return job.startedAt !== undefined;
}

/** The most recently created completed job that sent a campaign, if any. */
function latestSentJob(jobs: readonly DispatchJob[]): DispatchJob | undefined {
    return jobs
        .filter((job) => job.phase === 'completed' && job.campaignId !== undefined)
        .reduce<DispatchJob | undefined>((latest, job) => (latest === undefined || job.createdAt > latest.createdAt ? job : latest), undefined);
}

/**
 * True when `repeatOfJobId` confirms repeating the latest send. It names that job, or a
 * completed job created after it: such a job sent no campaign, so the operator who
 * confirms the repeat from the dispatch screen they are looking at is confirming the same
 * send, and the confirmation carries forward instead of being refused.
 */
function confirmsLatestSend(existing: readonly DispatchJob[], repeatOfJobId: string | undefined, latestSent: DispatchJob): boolean {
    if (repeatOfJobId === latestSent.id) {
        return true;
    }

    const confirmed = existing.find((job) => job.id === repeatOfJobId);

    return confirmed?.phase === 'completed' && confirmed.createdAt > latestSent.createdAt;
}

/**
 * Bookkeeping of interrupted rounds: counts the consecutive rounds whose results hold an
 * interruption and, past {@link INTERRUPTED_ROUNDS_BEFORE_ATTEMPT}, reports them as
 * transport failures, so the contacts behind them spend attempts instead of being retried
 * after every cooldown forever. A round without interruptions resets the count.
 */
export function trackInterruptedRounds(job: DispatchJob, results: readonly CallResult[]): { job: DispatchJob; results: readonly CallResult[] } {
    if (!results.some((result) => result.kind === 'interrupted')) {
        return { job: job.consecutiveInterruptedRounds === 0 ? job : { ...job, consecutiveInterruptedRounds: 0 }, results };
    }

    const rounds = job.consecutiveInterruptedRounds + 1;
    const tracked: DispatchJob = { ...job, consecutiveInterruptedRounds: rounds };

    if (rounds <= INTERRUPTED_ROUNDS_BEFORE_ATTEMPT) {
        return { job: tracked, results };
    }

    return {
        job: tracked,
        results: results.map((result) => (result.kind === 'interrupted' ? { kind: 'transportFailed', message: result.message } : result)),
    };
}

/** True for a phase a `continue` works on; every other phase is left untouched. */
export function isResumablePhase(phase: DispatchJobPhase): phase is ResumePhase {
    return RESUMABLE_PHASES.some((resumable) => resumable === phase);
}

/** True while another execution holds the job's lease. */
export function isLeased(job: DispatchJob, now: number): boolean {
    return job.leaseUntil !== undefined && job.leaseUntil > now;
}

/** True when the job's chunked phase still has contacts with work. */
export function hasPhaseWork(job: DispatchJob, phase: ChunkedPhase): boolean {
    return job.counts[workOutcomeOf(phase)] > 0;
}

/**
 * Moves the cursor past a processed chunk. The earliest deferral of the pass is kept; at
 * the end of the contacts, a phase that still has work starts the next pass from the
 * first contact, and reports `waitUntil` when every remaining contact was deferred.
 */
export function advanceCursor(job: DispatchJob, phase: ChunkedPhase, chunk: readonly DispatchContact[], now: number): { job: DispatchJob; waitUntil?: number } {
    const chunkDeferrals = chunk
        .filter((contact) => contact.outcome === workOutcomeOf(phase) && contact.retryNotBefore !== undefined && contact.retryNotBefore > now)
        .map((contact) => contact.retryNotBefore!);
    const passDeferredUntil = earliest([job.passDeferredUntil, ...chunkDeferrals]);
    const nextCursor = job.cursor + chunk.length;

    if (nextCursor < job.contactCount) {
        return { job: { ...job, cursor: nextCursor, passDeferredUntil } };
    }

    if (!hasPhaseWork(job, phase)) {
        return { job: { ...job, cursor: job.contactCount, passDeferredUntil: undefined } };
    }

    return {
        job: { ...job, cursor: 0, pass: job.pass + 1, passDeferredUntil: undefined },
        waitUntil: passDeferredUntil,
    };
}

/** `resolving` (or the preview exclusion run) → `awaitingConfirmation`, once no contact needs a lookup. */
export function toAwaitingConfirmation(job: DispatchJob, now: number): DispatchJob {
    assertPhase(job, ['resolving', 'resolvingExclusions'], 'await confirmation');

    return { ...job, phase: 'awaitingConfirmation', cursor: 0, pass: 0, passDeferredUntil: undefined, updatedAt: now };
}

/**
 * `awaitingConfirmation` → the confirmed run, with the segmentation, the pacing in Hablla
 * units and who started it. A request that excludes by filter resolves the exclusion once
 * more before anything is written, so the confirmed job goes through `resolvingExclusions`
 * first; without filters it goes straight to `materializing`.
 */
export function toConfirmed(job: DispatchJob, segmentationId: string, operatorEmail: string, now: number): DispatchJob {
    assertPhase(job, ['awaitingConfirmation'], 'start materializing');

    const confirmed: DispatchJob = {
        ...job,
        phase: 'materializing',
        segmentationId,
        cursor: 0,
        pass: 0,
        passDeferredUntil: undefined,
        dispatchConfig: toDispatchConfig(job.settings.pacing),
        startedBy: operatorEmail,
        startedAt: now,
        updatedAt: now,
    };

    return excludesByFilter(job.exclusion) ? withExclusionRun(confirmed, 'send', now) : confirmed;
}

/** `resolvingExclusions` → its next page, with the page's attempts reset. */
export function toNextExclusionPage(job: DispatchJob, now: number): DispatchJob {
    assertPhase(job, ['resolvingExclusions'], 'read another exclusion page');

    return { ...job, exclusionCursor: requireExclusionCursor(job) + 1, exclusionAttempts: 0, updatedAt: now };
}

/**
 * `resolvingExclusions` → the phase its run precedes, once the last page was applied. The
 * preview run hands over to `resolving`, or straight to the confirmation when the exclusion
 * left no contact to look up; the confirmed run hands over to `materializing`, or completes
 * the job when the exclusion left nothing to send.
 */
export function toAfterExclusions(job: DispatchJob, now: number): DispatchJob {
    assertPhase(job, ['resolvingExclusions'], 'leave the exclusion phase');

    const resolved = withoutExclusionRun(job, now);

    if (requireExclusionPurpose(job) === 'preview') {
        return resolved.counts.pendingLookup > 0 ? { ...resolved, phase: 'resolving' } : toAwaitingConfirmation(resolved, now);
    }

    return resolved.counts.ready > 0 ? { ...resolved, phase: 'materializing' } : toCompleted(resolved, now);
}

/** The job with the exclusion bookkeeping cleared, at the start of the contacts. */
function withoutExclusionRun(job: DispatchJob, now: number): DispatchJob {
    return {
        ...job,
        exclusionPurpose: undefined,
        exclusionCursor: undefined,
        exclusionAttempts: undefined,
        cursor: 0,
        pass: 0,
        passDeferredUntil: undefined,
        updatedAt: now,
    };
}

/** `materializing` → `awaitingAudience`, expecting every contact in the audience. */
export function toAwaitingAudience(job: DispatchJob, now: number): DispatchJob {
    assertPhase(job, ['materializing'], 'await the audience');

    return {
        ...job,
        phase: 'awaitingAudience',
        audienceSize: job.counts.inAudience,
        audienceDeadlineAt: now + AUDIENCE_READY_TIMEOUT_MS,
        updatedAt: now,
    };
}

/** `awaitingAudience` → `sending`, once the audience count matches. */
export function toSending(job: DispatchJob, audienceCount: number, now: number): DispatchJob {
    assertPhase(job, ['awaitingAudience'], 'send');

    return { ...job, phase: 'sending', lastAudienceCount: audienceCount, updatedAt: now };
}

/** → `completed` with nothing sent: no contact was ready, everyone was excluded, or the audience came out empty. */
export function toCompleted(job: DispatchJob, now: number): DispatchJob {
    assertPhase(job, ['awaitingConfirmation', 'resolvingExclusions', 'materializing'], 'complete');

    return { ...job, phase: 'completed', audienceSize: job.counts.inAudience, updatedAt: now };
}

/**
 * `sending` → `completed` with the campaign read back from Hablla, warning when the
 * quantity it resolved differs from the audience the dispatch prepared. The quantity never
 * comes from the creation response, which answers before the server resolves the audience.
 */
export function toCampaignCompleted(job: DispatchJob, campaign: { id: string; quantity: number }, now: number): DispatchJob {
    assertPhase(job, ['sending'], 'complete');

    const audienceSize = requireAudienceSize(job);
    const warnings = campaign.quantity === audienceSize
        ? job.warnings
        : [...job.warnings, { kind: 'campaignQuantityMismatch' as const, campaignQuantity: campaign.quantity, audienceSize }];

    return { ...withCampaignSettled(job, now), campaignId: campaign.id, campaignQuantity: campaign.quantity, warnings };
}

/**
 * `sending` → `completed` with the campaign created but never read back: the messages are
 * out, so the job is over, and the check that guards against a campaign resolving beyond
 * the audience could not run — which `campaignQuantityUnverified` records instead of the
 * job passing for a clean dispatch.
 */
export function toCampaignUnverified(job: DispatchJob, detail: string, now: number): DispatchJob {
    assertPhase(job, ['sending'], 'complete');

    return {
        ...withCampaignSettled(job, now),
        warnings: [...job.warnings, { kind: 'campaignQuantityUnverified' as const, audienceSize: requireAudienceSize(job), detail }],
    };
}

/** The job completed with its campaign bookkeeping closed. */
function withCampaignSettled(job: DispatchJob, now: number): DispatchJob {
    return {
        ...job,
        phase: 'completed',
        campaignSendState: undefined,
        campaignReconcileNotBefore: undefined,
        campaignReconcileAttempts: undefined,
        updatedAt: now,
    };
}

/** The job failure reason of a token the gateway refused. */
export function tokenRejectedReason(strategy: AuthStrategy): JobFailureReason {
    return strategy === 'bearer' ? 'bearer_token_rejected' : 'workspace_token_rejected';
}

/**
 * The failure of a phase whose call had its token refused, naming the token the route used.
 * `calls` and `results` are aligned.
 *
 * @throws Error when no result is a token rejection (a classification bug).
 */
export function tokenRejectedFailure(calls: readonly HttpCall[], results: readonly CallResult[], step: string, resumePhase: ResumePhase): JobFailure {
    const strategy = rejectedTokenStrategy(calls, results);

    return { reason: tokenRejectedReason(strategy), detail: `${step} refused the ${strategy} token`, resumePhase };
}

/** A working phase → `failed`; the failure names the phase `start` re-enters. */
export function toFailed(job: DispatchJob, failure: JobFailure, now: number): DispatchJob {
    assertPhase(job, RESUMABLE_PHASES, 'fail');

    return { ...job, phase: 'failed', failure, updatedAt: now };
}

/** `failed` → its resume phase; the audience wait gets a fresh deadline. */
export function toResumed(job: DispatchJob, now: number): DispatchJob {
    assertPhase(job, ['failed'], 'resume');

    const resumePhase = job.failure!.resumePhase;

    return {
        ...job,
        phase: resumePhase,
        failure: undefined,
        audienceDeadlineAt: resumePhase === 'awaitingAudience' ? now + AUDIENCE_READY_TIMEOUT_MS : job.audienceDeadlineAt,
        updatedAt: now,
    };
}

/** A job not yet started → `superseded` by a newer plan of the same audience. */
export function toSuperseded(job: DispatchJob, now: number): DispatchJob {
    assertPhase(job, ['resolvingExclusions', 'resolving', 'awaitingConfirmation'], 'be superseded');

    if (isConfirmed(job)) {
        throw new InvalidJobTransitionError(job.id, job.phase, 'be superseded once it was confirmed');
    }

    return { ...job, phase: 'superseded', updatedAt: now };
}

/**
 * Any phase that is not over (including `failed`) → `abandoned`; nothing written is undone.
 * Refused while the campaign is unresolved (`campaignSendState` set, whether its POST
 * outcome is unknown or it was created and not read back): an abandoned job no longer
 * blocks its audience, so abandoning it before the campaign is resolved could send the same
 * campaign twice.
 */
export function toAbandoned(job: DispatchJob, operatorEmail: string, now: number): DispatchJob {
    if (TERMINAL_PHASES.includes(job.phase)) {
        throw new InvalidJobTransitionError(job.id, job.phase, 'be abandoned');
    }

    if (job.campaignSendState !== undefined) {
        throw new InvalidJobTransitionError(job.id, job.phase, 'be abandoned before its campaign is read back');
    }

    return { ...job, phase: 'abandoned', abandonedBy: operatorEmail, abandonedAt: now, updatedAt: now };
}

/**
 * What the caller should do next: cool down after a throttle or a network failure, wait
 * for deferred contacts, confirm, stop when over, poll the audience, wait for a campaign
 * reconciliation, or continue right away.
 */
export function nextStepOf(job: DispatchJob, stop: EarlyStop | undefined, now: number): DispatchNextStep {
    if (stop && 'cause' in stop) {
        return { kind: 'continueAfter', delayMs: stop.cause === 'throttled' ? THROTTLE_COOLDOWN_MS : TRANSPORT_COOLDOWN_MS };
    }

    if (stop) {
        return { kind: 'continueAfter', delayMs: Math.max(0, stop.waitUntil - now) };
    }

    switch (job.phase) {
        case 'awaitingConfirmation':
            return { kind: 'awaitConfirmation' };
        case 'completed':
        case 'failed':
        case 'superseded':
        case 'abandoned':
            return { kind: 'finished' };
        case 'awaitingAudience':
            return { kind: 'continueAfter', delayMs: AUDIENCE_POLL_INTERVAL_MS };
        case 'sending':
            return { kind: 'continueAfter', delayMs: Math.max(0, (job.campaignReconcileNotBefore ?? now) - now) };
        case 'resolvingExclusions':
        case 'resolving':
        case 'materializing':
            return { kind: 'continueAfter', delayMs: 0 };
    }
}

/**
 * Guards a transition.
 *
 * @throws InvalidJobTransitionError when the job is not in one of the allowed phases.
 */
function assertPhase(job: DispatchJob, allowed: readonly DispatchJobPhase[], transition: string): void {
    if (!allowed.includes(job.phase)) {
        throw new InvalidJobTransitionError(job.id, job.phase, transition);
    }
}

/** The smallest defined value, or `undefined` when there is none. */
function earliest(values: readonly (number | undefined)[]): number | undefined {
    const defined = values.filter((value): value is number => value !== undefined);

    return defined.length > 0 ? Math.min(...defined) : undefined;
}
