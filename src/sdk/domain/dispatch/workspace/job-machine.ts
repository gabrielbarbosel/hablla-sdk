/**
 * The pure state machine of a dispatch job: creation, duplicate verdicts, outcome
 * counts, the chunk cursor and passes, phase transitions and the next step for callers.
 */

import type { PreparedAudience } from './audience';
import type { StopCause } from './call-failures';
import type {
    ChunkedPhase,
    ContactOutcome,
    DispatchContact,
    DispatchJob,
    DispatchJobPhase,
    DispatchNextStep,
    JobFailure,
    WorkspaceDispatchRequest,
} from './types';
import { toDispatchConfig } from './campaign';
import { AUDIENCE_POLL_INTERVAL_MS, AUDIENCE_READY_TIMEOUT_MS, THROTTLE_COOLDOWN_MS, TRANSPORT_COOLDOWN_MS } from './constants';
import { workOutcomeOf } from './contact-step';
import { InvalidJobTransitionError } from './errors';

/** Phases a `continue` works on; every other phase is left untouched. */
export const RESUMABLE_PHASES: readonly DispatchJobPhase[] = ['resolving', 'materializing', 'awaitingAudience', 'sending'];

/** Phases in which the job is over. */
const TERMINAL_PHASES: readonly DispatchJobPhase[] = ['completed', 'superseded', 'abandoned'];

/** Every contact outcome, for complete counts. */
const CONTACT_OUTCOMES: readonly ContactOutcome[] = [
    'invalidPhone',
    'repeatedPhone',
    'excluded',
    'missingName',
    'unresolvedAdvisor',
    'pendingLookup',
    'lookupFailed',
    'inAttendance',
    'duplicatePersons',
    'blocked',
    'noWhatsapp',
    'repeatedPerson',
    'ready',
    'writeFailed',
    'inAudience',
];

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
 * A new job at revision 0: `resolving`, or `awaitingConfirmation` when no contact needs
 * a lookup. Its id is the fingerprint plus the creation time in base 36.
 */
export function createJob(prepared: PreparedAudience, request: WorkspaceDispatchRequest, now: number): DispatchJob {
    const { rows: _rows, exclusion, ...settings } = request;
    const firstPending = prepared.contacts.find((contact) => contact.outcome === 'pendingLookup');

    return {
        id: `${prepared.fingerprint}-${now.toString(36)}`,
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
        warnings: [],
    };
}

/**
 * Verdict over the other jobs with the same fingerprint. A job not yet started is
 * superseded when idle and makes `plan` busy while leased; a started or failed job
 * refuses. Among the completed jobs with a campaign only the latest counts: it refuses
 * unless it is the one the operator confirmed repeating, so a chain of confirmed repeats
 * stays possible. Completed jobs without a campaign, superseded and abandoned ones are ignored.
 */
export function duplicateVerdict(existing: readonly DispatchJob[], repeatOfJobId: string | undefined, now: number): DuplicateVerdict {
    const supersede: DispatchJob[] = [];
    const latestSent = latestSentJob(existing);
    let busy: DispatchJob | undefined;

    for (const job of existing) {
        switch (job.phase) {
            case 'resolving':
            case 'awaitingConfirmation':
                if (isLeased(job, now)) {
                    busy ??= job;
                } else {
                    supersede.push(job);
                }
                break;
            case 'materializing':
            case 'awaitingAudience':
            case 'sending':
            case 'failed':
                return { kind: 'refuse', job };
            case 'completed':
                if (job === latestSent && repeatOfJobId !== job.id) {
                    return { kind: 'refuse', job };
                }
                break;
            case 'superseded':
            case 'abandoned':
                break;
        }
    }

    return busy ? { kind: 'busy', job: busy } : { kind: 'create', supersede };
}

/** The most recently created completed job that sent a campaign, if any. */
function latestSentJob(jobs: readonly DispatchJob[]): DispatchJob | undefined {
    return jobs
        .filter((job) => job.phase === 'completed' && job.campaignId !== undefined)
        .reduce<DispatchJob | undefined>((latest, job) => (latest === undefined || job.createdAt > latest.createdAt ? job : latest), undefined);
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
export function advanceCursor(job: DispatchJob, chunk: readonly DispatchContact[], now: number): { job: DispatchJob; waitUntil?: number } {
    const phase = job.phase as ChunkedPhase;
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

/** `resolving` → `awaitingConfirmation`, once no contact needs a lookup. */
export function toAwaitingConfirmation(job: DispatchJob, now: number): DispatchJob {
    assertPhase(job, ['resolving'], 'await confirmation');

    return { ...job, phase: 'awaitingConfirmation', cursor: 0, pass: 0, passDeferredUntil: undefined, updatedAt: now };
}

/** `awaitingConfirmation` → `materializing`, with the segmentation, the pacing in Hablla units and who started it. */
export function toMaterializing(job: DispatchJob, segmentationId: string, operatorEmail: string, now: number): DispatchJob {
    assertPhase(job, ['awaitingConfirmation'], 'start materializing');

    return {
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

/**
 * → `completed`: with nothing to send (no contact ready or an empty audience), or with the
 * campaign created, warning when its quantity differs from the audience.
 */
export function toCompleted(job: DispatchJob, now: number, campaign?: { id: string; quantity: number }): DispatchJob {
    assertPhase(job, campaign ? ['sending'] : ['awaitingConfirmation', 'materializing'], 'complete');

    if (!campaign) {
        return { ...job, phase: 'completed', audienceSize: job.counts.inAudience, updatedAt: now };
    }

    const audienceSize = requireAudienceSize(job);
    const warnings = campaign.quantity === audienceSize
        ? job.warnings
        : [...job.warnings, { kind: 'campaignQuantityMismatch' as const, campaignQuantity: campaign.quantity, audienceSize }];

    return {
        ...job,
        phase: 'completed',
        campaignId: campaign.id,
        campaignQuantity: campaign.quantity,
        campaignSendState: undefined,
        campaignReconcileNotBefore: undefined,
        campaignReconcileAttempts: undefined,
        warnings,
        updatedAt: now,
    };
}

/** A working phase → `failed`; the failure names the phase `start` re-enters. */
export function toFailed(job: DispatchJob, failure: JobFailure, now: number): DispatchJob {
    assertPhase(job, ['resolving', 'materializing', 'awaitingAudience', 'sending'], 'fail');

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
    assertPhase(job, ['resolving', 'awaitingConfirmation'], 'be superseded');

    return { ...job, phase: 'superseded', updatedAt: now };
}

/**
 * Any phase that is not over (including `failed`) → `abandoned`; nothing written is undone.
 * Refused while a campaign POST may have gone out (`campaignSendState` in flight): an
 * abandoned job no longer blocks its audience, so abandoning it before the campaign is
 * reconciled could send the same campaign twice.
 */
export function toAbandoned(job: DispatchJob, operatorEmail: string, now: number): DispatchJob {
    if (TERMINAL_PHASES.includes(job.phase)) {
        throw new InvalidJobTransitionError(job.id, job.phase, 'be abandoned');
    }

    if (job.campaignSendState === 'inFlight') {
        throw new InvalidJobTransitionError(job.id, job.phase, 'be abandoned before its in-flight campaign is reconciled');
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

/**
 * The expected audience size, set when the job entered `awaitingAudience`.
 *
 * @throws Error when absent (a planning bug).
 */
export function requireAudienceSize(job: DispatchJob): number {
    if (job.audienceSize === undefined) {
        throw new Error(`Dispatch job ${job.id} has no audience size`);
    }

    return job.audienceSize;
}
