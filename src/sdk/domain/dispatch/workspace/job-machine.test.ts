import { describe, it, expect } from 'vitest';
import {
    advanceCursor,
    countOutcomes,
    createJob,
    duplicateVerdict,
    nextStepOf,
    tallyOutcomes,
    toAbandoned,
    toAwaitingAudience,
    toAwaitingConfirmation,
    toAfterExclusions,
    toCampaignCompleted,
    toCampaignUnverified,
    toCompleted,
    toConfirmed,
    toFailed,
    toNextExclusionPage,
    toResumed,
    toSending,
    toSuperseded,
    trackInterruptedRounds,
} from './job-machine';
import { prepareAudience } from './audience';
import { AUDIENCE_POLL_INTERVAL_MS, AUDIENCE_READY_TIMEOUT_MS, FIRST_EXCLUSION_PAGE, INTERRUPTED_ROUNDS_BEFORE_ATTEMPT, THROTTLE_COOLDOWN_MS, TRANSPORT_COOLDOWN_MS } from './constants';
import { InvalidJobTransitionError } from './errors';
import { isJobId, jobIdOf } from './job-id';
import { NO_CALLS_SPENT, ROSTER, aContact, aRequest, aRow, completed } from './__fixtures__/builders';
import type { DispatchJob, DispatchJobPhase, JobFailure } from './types';

const NOW = 1_800_000_000_000;
const FAILURE: JobFailure = { reason: 'workspace_token_rejected', detail: 'x', resumePhase: 'materializing' };
const FILTERS = [{ type: 'in_segmentation', segmentation: '6a589ac29c70672890006862' }];

/** A job created from a request with three rows (one invalid phone). */
function aJob(overrides: Partial<DispatchJob> = {}): DispatchJob {
    const request = aRequest({ rows: [aRow('1', { phone: 'bad' }), aRow('2'), aRow('3')], exclusion: { phones: ['5551999000009'], segmentationFilters: [] } });
    return { ...createJob(prepareAudience(request, ROSTER), request, NOW, NO_CALLS_SPENT), ...overrides };
}

describe('createJob', () => {
    it('starts in resolving at the first contact that needs a lookup, with derived counts', () => {
        const job = aJob();

        expect(job).toMatchObject({ revision: 0, phase: 'resolving', cursor: 1, pass: 0, contactCount: 3, createdAt: NOW, updatedAt: NOW, revalidationShifts: {}, warnings: [] });
        expect(job.counts).toMatchObject({ invalidPhone: 1, pendingLookup: 2, ready: 0 });
        expect(job.exclusion).toEqual({ phoneCount: 1, segmentationFilters: [] });
        expect(job.settings).not.toHaveProperty('rows');
        expect(job.id).toBe(jobIdOf(job.fingerprint, NOW));
        expect(isJobId(job.id)).toBe(true);
    });

    it('awaits confirmation right away when no contact needs a lookup', () => {
        const request = aRequest({ rows: [aRow('1', { phone: 'bad' })] });

        expect(createJob(prepareAudience(request, ROSTER), request, NOW, NO_CALLS_SPENT).phase).toBe('awaitingConfirmation');
    });

    it('resolves the exclusion first when the request excludes by filter', () => {
        const request = aRequest({ exclusion: { phones: [], segmentationFilters: FILTERS } });
        const job = createJob(prepareAudience(request, ROSTER), request, NOW, NO_CALLS_SPENT);

        expect(job).toMatchObject({ phase: 'resolvingExclusions', exclusionPurpose: 'preview', exclusionCursor: FIRST_EXCLUSION_PAGE, exclusionAttempts: 0 });
        expect(job.exclusion.segmentationFilters).toEqual(FILTERS);
    });

    it('skips the exclusion phase when no contact needs a lookup', () => {
        const request = aRequest({ rows: [aRow('1', { phone: 'bad' })], exclusion: { phones: [], segmentationFilters: FILTERS } });

        expect(createJob(prepareAudience(request, ROSTER), request, NOW, NO_CALLS_SPENT).phase).toBe('awaitingConfirmation');
    });
});

describe('duplicateVerdict', () => {
    const job = (phase: DispatchJobPhase, overrides: Partial<DispatchJob> = {}): DispatchJob => aJob({ id: `job-${phase}`, phase, ...overrides });

    it('supersedes idle jobs not yet started', () => {
        const idle = [job('resolving'), job('awaitingConfirmation', { leaseUntil: NOW })];

        expect(duplicateVerdict(idle, undefined, NOW)).toEqual({ kind: 'create', supersede: idle });
    });

    it('is busy while a job not yet started is leased', () => {
        const leased = job('resolving', { leaseUntil: NOW + 1 });

        expect(duplicateVerdict([leased], undefined, NOW)).toEqual({ kind: 'busy', job: leased });
    });

    it.each(['materializing', 'awaitingAudience', 'sending', 'failed'] as DispatchJobPhase[])('refuses over a %s job', (phase) => {
        const blocking = job(phase);

        expect(duplicateVerdict([job('resolving'), blocking], undefined, NOW)).toEqual({ kind: 'refuse', job: blocking });
    });

    it('refuses over a completed job with a campaign unless its repeat was confirmed', () => {
        const sent = job('completed', { campaignId: 'c1' });

        expect(duplicateVerdict([sent], undefined, NOW)).toEqual({ kind: 'refuse', job: sent });
        expect(duplicateVerdict([sent], 'another-job', NOW)).toEqual({ kind: 'refuse', job: sent });
        expect(duplicateVerdict([sent], sent.id, NOW)).toEqual({ kind: 'create', supersede: [] });
    });

    it('counts only the latest completed send, so each repeat confirms the one before it', () => {
        const older = job('completed', { id: 'job-older', campaignId: 'c1', createdAt: NOW });
        const latest = job('completed', { id: 'job-latest', campaignId: 'c2', createdAt: NOW + 1 });

        expect(duplicateVerdict([older, latest], undefined, NOW)).toEqual({ kind: 'refuse', job: latest });
        expect(duplicateVerdict([latest, older], older.id, NOW)).toEqual({ kind: 'refuse', job: latest });
        expect(duplicateVerdict([older, latest], latest.id, NOW)).toEqual({ kind: 'create', supersede: [] });
    });

    it('accepts a repeat confirmed from a completed job newer than the latest send, which sent nothing', () => {
        const sent = job('completed', { id: 'job-sent', campaignId: 'c1', createdAt: NOW });
        const newer = job('completed', { id: 'job-newer', createdAt: NOW + 1 });
        const older = job('completed', { id: 'job-older', createdAt: NOW - 1 });

        expect(duplicateVerdict([sent, newer], newer.id, NOW)).toEqual({ kind: 'create', supersede: [] });
        expect(duplicateVerdict([sent, newer], undefined, NOW)).toEqual({ kind: 'refuse', job: sent });
        expect(duplicateVerdict([sent, older], older.id, NOW)).toEqual({ kind: 'refuse', job: sent });
    });

    it('supersedes an exclusion run the operator has not confirmed and refuses a confirmed one', () => {
        const preview = job('resolvingExclusions', { exclusionPurpose: 'preview' });
        const confirmed = job('resolvingExclusions', { exclusionPurpose: 'send', startedAt: NOW });

        expect(duplicateVerdict([preview], undefined, NOW)).toEqual({ kind: 'create', supersede: [preview] });
        expect(duplicateVerdict([confirmed], undefined, NOW)).toEqual({ kind: 'refuse', job: confirmed });
    });

    it('ignores completed jobs without a campaign, superseded and abandoned jobs', () => {
        expect(duplicateVerdict([job('completed'), job('superseded'), job('abandoned')], undefined, NOW)).toEqual({ kind: 'create', supersede: [] });
    });
});

describe('trackInterruptedRounds', () => {
    const interrupted = { kind: 'interrupted', message: 'fetchAll failed' } as const;

    it('counts the interrupted rounds in a row and resets on a round without one', () => {
        const first = trackInterruptedRounds(aJob(), [interrupted]);

        expect(first.job.consecutiveInterruptedRounds).toBe(1);
        expect(first.results).toEqual([interrupted]);
        expect(trackInterruptedRounds(first.job, [completed(200)]).job.consecutiveInterruptedRounds).toBe(0);
    });

    it('reads the interruptions as transport failures past the limit, so attempts are spent', () => {
        const tracked = trackInterruptedRounds(aJob({ consecutiveInterruptedRounds: INTERRUPTED_ROUNDS_BEFORE_ATTEMPT }), [interrupted, { kind: 'unsent' }]);

        expect(tracked.job.consecutiveInterruptedRounds).toBe(INTERRUPTED_ROUNDS_BEFORE_ATTEMPT + 1);
        expect(tracked.results).toEqual([{ kind: 'transportFailed', message: 'fetchAll failed' }, { kind: 'unsent' }]);
    });
});

describe('tallyOutcomes', () => {
    it('moves counts from the previous to the current outcomes', () => {
        const before = [aContact(), aContact({ index: 1 })];
        const after = [aContact({ outcome: 'ready' }), aContact({ index: 1, outcome: 'inAttendance' })];

        expect(tallyOutcomes(countOutcomes(before), before, after)).toMatchObject({ pendingLookup: 0, ready: 1, inAttendance: 1 });
    });
});

describe('advanceCursor', () => {
    it('moves past the chunk and keeps the earliest deferral of the pass', () => {
        const job = aJob({ cursor: 0, contactCount: 4, passDeferredUntil: NOW + 500 });
        const chunk = [aContact({ retryNotBefore: NOW + 900 }), aContact({ index: 1, retryNotBefore: NOW + 100 })];

        expect(advanceCursor(job, 'resolving', chunk, NOW)).toEqual({ job: { ...job, cursor: 2, passDeferredUntil: NOW + 100 } });
    });

    it('ends the phase at the last contact when no work is left', () => {
        const job = aJob({ cursor: 2, counts: countOutcomes([aContact({ outcome: 'ready' })]) });

        expect(advanceCursor(job, 'resolving', [aContact({ index: 2, outcome: 'ready' })], NOW)).toEqual({ job: { ...job, cursor: 3, passDeferredUntil: undefined } });
    });

    it('starts the next pass when work is left, waiting for the earliest deferral', () => {
        const job = aJob({ cursor: 2 });
        const deferred = aContact({ index: 2, retryNotBefore: NOW + 60_000 });

        expect(advanceCursor(job, 'resolving', [deferred], NOW)).toEqual({ job: { ...job, cursor: 0, pass: 1, passDeferredUntil: undefined }, waitUntil: NOW + 60_000 });
    });

    it('starts the next pass without waiting when nothing was deferred', () => {
        expect(advanceCursor(aJob({ cursor: 2 }), 'resolving', [aContact({ index: 2 })], NOW).waitUntil).toBeUndefined();
    });
});

describe('transitions', () => {
    it('walks the happy path', () => {
        const confirmed = toAwaitingConfirmation(aJob(), NOW + 1);
        const materializing = toConfirmed(confirmed, 'seg-1', 'operator@example.com', NOW + 2);
        const awaiting = toAwaitingAudience({ ...materializing, counts: { ...materializing.counts, inAudience: 2 } }, NOW + 3);
        const sending = toSending(awaiting, 2, NOW + 4);
        const completed = toCampaignCompleted(sending, { id: 'c1', quantity: 2 }, NOW + 5);

        expect(materializing).toMatchObject({ phase: 'materializing', segmentationId: 'seg-1', startedBy: 'operator@example.com', startedAt: NOW + 2, cursor: 0, pass: 0, dispatchConfig: { batch_size: 5, batch_interval: 10 / 60 } });
        expect(awaiting).toMatchObject({ phase: 'awaitingAudience', audienceSize: 2, audienceDeadlineAt: NOW + 3 + AUDIENCE_READY_TIMEOUT_MS });
        expect(sending).toMatchObject({ phase: 'sending', lastAudienceCount: 2 });
        expect(completed).toMatchObject({ phase: 'completed', campaignId: 'c1', campaignQuantity: 2, warnings: [] });
    });

    describe('the exclusion runs', () => {
        /** A job in the exclusion phase of the given run, at its first page. */
        const excluding = (exclusionPurpose: 'preview' | 'send', overrides: Partial<DispatchJob> = {}): DispatchJob => aJob({
            phase: 'resolvingExclusions',
            exclusionPurpose,
            exclusionCursor: FIRST_EXCLUSION_PAGE,
            exclusionAttempts: 2,
            ...overrides,
        });

        it('reads the next page with the attempts of the last one reset', () => {
            expect(toNextExclusionPage(excluding('preview'), NOW)).toMatchObject({ phase: 'resolvingExclusions', exclusionCursor: FIRST_EXCLUSION_PAGE + 1, exclusionAttempts: 0 });
        });

        it('hands the preview run over to resolving, or to the confirmation when nothing is left to look up', () => {
            const resolving = toAfterExclusions(excluding('preview'), NOW);

            expect(resolving).toMatchObject({ phase: 'resolving', cursor: 0, pass: 0 });
            expect(resolving.exclusionPurpose).toBeUndefined();
            expect(resolving.exclusionCursor).toBeUndefined();
            expect(resolving.exclusionAttempts).toBeUndefined();

            const everyoneExcluded = excluding('preview', { counts: countOutcomes([aContact({ outcome: 'excluded' })]) });

            expect(toAfterExclusions(everyoneExcluded, NOW).phase).toBe('awaitingConfirmation');
        });

        it('hands the confirmed run over to materializing, or completes the job when nothing is left to send', () => {
            const ready = excluding('send', { counts: countOutcomes([aContact({ outcome: 'ready' })]) });

            expect(toAfterExclusions(ready, NOW)).toMatchObject({ phase: 'materializing', cursor: 0, pass: 0 });

            const completed = toAfterExclusions(excluding('send', { counts: countOutcomes([aContact({ outcome: 'excluded' })]) }), NOW);

            expect(completed).toMatchObject({ phase: 'completed', audienceSize: 0 });
            expect(completed.campaignId).toBeUndefined();
        });

        it('only leaves the phase from inside it, and only with a run in progress', () => {
            expect(() => toAfterExclusions(aJob({ phase: 'resolving' }), NOW)).toThrow(InvalidJobTransitionError);
            expect(() => toNextExclusionPage(aJob({ phase: 'materializing' }), NOW)).toThrow(InvalidJobTransitionError);
            expect(() => toAfterExclusions(aJob({ phase: 'resolvingExclusions' }), NOW)).toThrow(/no exclusion run in progress/);
        });

        it('confirms into a second exclusion run before materializing, and straight into it without filters', () => {
            const withFilters = aJob({ phase: 'awaitingConfirmation', exclusion: { phoneCount: 0, segmentationFilters: FILTERS } });
            const confirmed = toConfirmed(withFilters, 'seg-1', 'operator@example.com', NOW);

            expect(confirmed).toMatchObject({ phase: 'resolvingExclusions', exclusionPurpose: 'send', exclusionCursor: FIRST_EXCLUSION_PAGE, exclusionAttempts: 0, segmentationId: 'seg-1', startedAt: NOW });
            expect(toConfirmed(aJob({ phase: 'awaitingConfirmation' }), 'seg-1', 'operator@example.com', NOW).phase).toBe('materializing');
        });

        it('supersedes a preview run but never a confirmed one', () => {
            expect(toSuperseded(excluding('preview'), NOW).phase).toBe('superseded');
            expect(() => toSuperseded(excluding('send', { startedAt: NOW }), NOW)).toThrow(InvalidJobTransitionError);
        });
    });

    it('warns when the campaign quantity read back differs from the audience', () => {
        const sending = aJob({ phase: 'sending', audienceSize: 3, campaignSendState: 'sent' });

        expect(toCampaignCompleted(sending, { id: 'c1', quantity: 2 }, NOW).warnings).toEqual([{ kind: 'campaignQuantityMismatch', campaignQuantity: 2, audienceSize: 3 }]);
    });

    it('completes a campaign whose quantity was never read back with a warning, keeping no quantity', () => {
        const unverified = toCampaignUnverified(aJob({ phase: 'sending', audienceSize: 3, campaignId: 'c1', campaignSendState: 'sent' }), 'listing answered 500', NOW);

        expect(unverified).toMatchObject({ phase: 'completed', campaignId: 'c1', campaignSendState: undefined });
        expect(unverified.campaignQuantity).toBeUndefined();
        expect(unverified.warnings).toEqual([{ kind: 'campaignQuantityUnverified', audienceSize: 3, detail: 'listing answered 500' }]);
    });

    it('completes without a campaign when nothing is left to send', () => {
        const completed = toCompleted(aJob({ phase: 'awaitingConfirmation' }), NOW);

        expect(completed).toMatchObject({ phase: 'completed', audienceSize: 0 });
        expect(completed.campaignId).toBeUndefined();
        expect(() => toCompleted(aJob({ phase: 'sending', audienceSize: 1 }), NOW)).toThrow(InvalidJobTransitionError);
    });

    it('fails and resumes into the failure phase, renewing the audience deadline', () => {
        const failed = toFailed(aJob({ phase: 'awaitingAudience', audienceDeadlineAt: NOW }), { ...FAILURE, resumePhase: 'awaitingAudience' }, NOW);
        const resumed = toResumed(failed, NOW + 10);

        expect(resumed).toMatchObject({ phase: 'awaitingAudience', failure: undefined, audienceDeadlineAt: NOW + 10 + AUDIENCE_READY_TIMEOUT_MS });
    });

    it('supersedes only jobs not yet started', () => {
        expect(toSuperseded(aJob(), NOW).phase).toBe('superseded');
        expect(() => toSuperseded(aJob({ phase: 'materializing' }), NOW)).toThrow(InvalidJobTransitionError);
    });

    it('abandons any unfinished or failed job, recording the operator', () => {
        expect(toAbandoned(aJob({ phase: 'failed', failure: FAILURE }), 'operator@example.com', NOW)).toMatchObject({ phase: 'abandoned', abandonedBy: 'operator@example.com', abandonedAt: NOW });

        for (const phase of ['completed', 'superseded', 'abandoned'] as DispatchJobPhase[]) {
            expect(() => toAbandoned(aJob({ phase }), 'operator@example.com', NOW)).toThrow(InvalidJobTransitionError);
        }
    });

    it('refuses to abandon while the campaign is unresolved, whether in flight or only created', () => {
        const unknownCampaign: JobFailure = { reason: 'campaign_outcome_unknown', detail: 'x', resumePhase: 'sending' };

        expect(() => toAbandoned(aJob({ phase: 'sending', campaignSendState: 'inFlight' }), 'operator@example.com', NOW)).toThrow(InvalidJobTransitionError);
        expect(() => toAbandoned(aJob({ phase: 'sending', campaignSendState: 'sent', campaignId: 'c1' }), 'operator@example.com', NOW)).toThrow(InvalidJobTransitionError);
        expect(() => toAbandoned(aJob({ phase: 'failed', failure: unknownCampaign, campaignSendState: 'inFlight' }), 'operator@example.com', NOW)).toThrow(InvalidJobTransitionError);
    });

    it.each([
        ['awaitConfirmation', () => toAwaitingConfirmation(aJob({ phase: 'materializing' }), NOW)],
        ['materializing', () => toConfirmed(aJob(), 'seg', 'op', NOW)],
        ['awaitingAudience', () => toAwaitingAudience(aJob(), NOW)],
        ['sending', () => toSending(aJob({ phase: 'materializing' }), 1, NOW)],
        ['failed', () => toFailed(aJob({ phase: 'completed' }), FAILURE, NOW)],
        ['resume', () => toResumed(aJob(), NOW)],
    ])('refuses an invalid transition to %s', (_label, transition) => {
        expect(transition).toThrow(InvalidJobTransitionError);
    });
});

describe('nextStepOf', () => {
    it('cools down after a throttle or an interrupted wave', () => {
        expect(nextStepOf(aJob(), { cause: 'throttled' }, NOW)).toEqual({ kind: 'continueAfter', delayMs: THROTTLE_COOLDOWN_MS });
        expect(nextStepOf(aJob(), { cause: 'interrupted' }, NOW)).toEqual({ kind: 'continueAfter', delayMs: TRANSPORT_COOLDOWN_MS });
    });

    it('waits for deferred contacts', () => {
        expect(nextStepOf(aJob(), { waitUntil: NOW + 5 }, NOW)).toEqual({ kind: 'continueAfter', delayMs: 5 });
    });

    it('maps each phase to its next step', () => {
        expect(nextStepOf(aJob({ phase: 'awaitingConfirmation' }), undefined, NOW)).toEqual({ kind: 'awaitConfirmation' });
        expect(nextStepOf(aJob({ phase: 'awaitingAudience' }), undefined, NOW)).toEqual({ kind: 'continueAfter', delayMs: AUDIENCE_POLL_INTERVAL_MS });
        expect(nextStepOf(aJob({ phase: 'sending', campaignReconcileNotBefore: NOW + 7 }), undefined, NOW)).toEqual({ kind: 'continueAfter', delayMs: 7 });
        expect(nextStepOf(aJob({ phase: 'sending' }), undefined, NOW)).toEqual({ kind: 'continueAfter', delayMs: 0 });
        expect(nextStepOf(aJob({ phase: 'materializing' }), undefined, NOW)).toEqual({ kind: 'continueAfter', delayMs: 0 });
        expect(nextStepOf(aJob({ phase: 'resolvingExclusions' }), undefined, NOW)).toEqual({ kind: 'continueAfter', delayMs: 0 });

        for (const phase of ['completed', 'failed', 'superseded', 'abandoned'] as DispatchJobPhase[]) {
            expect(nextStepOf(aJob({ phase }), undefined, NOW)).toEqual({ kind: 'finished' });
        }
    });
});
