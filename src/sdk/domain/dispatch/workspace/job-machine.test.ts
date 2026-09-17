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
    toCompleted,
    toFailed,
    toMaterializing,
    toResumed,
    toSending,
    toSuperseded,
} from './job-machine';
import { prepareAudience } from './audience';
import { AUDIENCE_POLL_INTERVAL_MS, AUDIENCE_READY_TIMEOUT_MS, THROTTLE_COOLDOWN_MS, TRANSPORT_COOLDOWN_MS } from './constants';
import { InvalidJobTransitionError } from './errors';
import { JOB_ID_PATTERN } from './request-validation';
import { ROSTER, aContact, aRequest, aRow } from './__fixtures__/builders';
import type { DispatchJob, DispatchJobPhase, JobFailure } from './types';

const NOW = 1_800_000_000_000;
const FAILURE: JobFailure = { reason: 'workspace_token_rejected', detail: 'x', resumePhase: 'materializing' };

/** A job created from a request with three rows (one invalid phone). */
function aJob(overrides: Partial<DispatchJob> = {}): DispatchJob {
    const request = aRequest({ rows: [aRow('1', { phone: 'bad' }), aRow('2'), aRow('3')], exclusion: { phones: ['5551999000009'], segmentationFilters: [] } });
    return { ...createJob(prepareAudience(request, ROSTER), request, NOW), ...overrides };
}

describe('createJob', () => {
    it('starts in resolving at the first contact that needs a lookup, with derived counts', () => {
        const job = aJob();

        expect(job).toMatchObject({ revision: 0, phase: 'resolving', cursor: 1, pass: 0, contactCount: 3, createdAt: NOW, updatedAt: NOW, revalidationShifts: {}, warnings: [] });
        expect(job.counts).toMatchObject({ invalidPhone: 1, pendingLookup: 2, ready: 0 });
        expect(job.exclusion).toEqual({ phoneCount: 1, segmentationFilters: [] });
        expect(job.settings).not.toHaveProperty('rows');
        expect(job.id).toBe(`${job.fingerprint}-${NOW.toString(36)}`);
        expect(JOB_ID_PATTERN.test(job.id)).toBe(true);
    });

    it('awaits confirmation right away when no contact needs a lookup', () => {
        const request = aRequest({ rows: [aRow('1', { phone: 'bad' })] });

        expect(createJob(prepareAudience(request, ROSTER), request, NOW).phase).toBe('awaitingConfirmation');
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

    it('ignores completed jobs without a campaign, superseded and abandoned jobs', () => {
        expect(duplicateVerdict([job('completed'), job('superseded'), job('abandoned')], undefined, NOW)).toEqual({ kind: 'create', supersede: [] });
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

        expect(advanceCursor(job, chunk, NOW)).toEqual({ job: { ...job, cursor: 2, passDeferredUntil: NOW + 100 } });
    });

    it('ends the phase at the last contact when no work is left', () => {
        const job = aJob({ cursor: 2, counts: countOutcomes([aContact({ outcome: 'ready' })]) });

        expect(advanceCursor(job, [aContact({ index: 2, outcome: 'ready' })], NOW)).toEqual({ job: { ...job, cursor: 3, passDeferredUntil: undefined } });
    });

    it('starts the next pass when work is left, waiting for the earliest deferral', () => {
        const job = aJob({ cursor: 2 });
        const deferred = aContact({ index: 2, retryNotBefore: NOW + 60_000 });

        expect(advanceCursor(job, [deferred], NOW)).toEqual({ job: { ...job, cursor: 0, pass: 1, passDeferredUntil: undefined }, waitUntil: NOW + 60_000 });
    });

    it('starts the next pass without waiting when nothing was deferred', () => {
        expect(advanceCursor(aJob({ cursor: 2 }), [aContact({ index: 2 })], NOW).waitUntil).toBeUndefined();
    });
});

describe('transitions', () => {
    it('walks the happy path', () => {
        const confirmed = toAwaitingConfirmation(aJob(), NOW + 1);
        const materializing = toMaterializing(confirmed, 'seg-1', 'operator@example.com', NOW + 2);
        const awaiting = toAwaitingAudience({ ...materializing, counts: { ...materializing.counts, inAudience: 2 } }, NOW + 3);
        const sending = toSending(awaiting, 2, NOW + 4);
        const completed = toCompleted(sending, NOW + 5, { id: 'c1', quantity: 2 });

        expect(materializing).toMatchObject({ phase: 'materializing', segmentationId: 'seg-1', startedBy: 'operator@example.com', startedAt: NOW + 2, cursor: 0, pass: 0, dispatchConfig: { batch_size: 5, batch_interval: 10 / 60 } });
        expect(awaiting).toMatchObject({ phase: 'awaitingAudience', audienceSize: 2, audienceDeadlineAt: NOW + 3 + AUDIENCE_READY_TIMEOUT_MS });
        expect(sending).toMatchObject({ phase: 'sending', lastAudienceCount: 2 });
        expect(completed).toMatchObject({ phase: 'completed', campaignId: 'c1', campaignQuantity: 2, warnings: [] });
    });

    it('warns when the campaign quantity differs from the audience', () => {
        const sending = aJob({ phase: 'sending', audienceSize: 3 });

        expect(toCompleted(sending, NOW, { id: 'c1', quantity: 2 }).warnings).toEqual([{ kind: 'campaignQuantityMismatch', campaignQuantity: 2, audienceSize: 3 }]);
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

    it.each([
        ['awaitConfirmation', () => toAwaitingConfirmation(aJob({ phase: 'materializing' }), NOW)],
        ['materializing', () => toMaterializing(aJob(), 'seg', 'op', NOW)],
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

        for (const phase of ['completed', 'failed', 'superseded', 'abandoned'] as DispatchJobPhase[]) {
            expect(nextStepOf(aJob({ phase }), undefined, NOW)).toEqual({ kind: 'finished' });
        }
    });
});
