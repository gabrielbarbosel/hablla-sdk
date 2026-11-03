import { describe, it, expect } from 'vitest';
import { EXCLUSION_RUNS_PER_DISPATCH, callBudgetOf, estimateCallBudget, estimatedCallsPerContact } from './call-budget';
import { DEFAULT_DISPATCH_TUNING, resolveDispatchTuning } from './tuning';
import { aContact } from './__fixtures__/builders';

const PER_CONTACT = estimatedCallsPerContact(DEFAULT_DISPATCH_TUNING);

describe('estimateCallBudget', () => {
    it('counts both lookups, the longest write plan and the retries of the largest step per contact', () => {
        expect(PER_CONTACT).toBe(4 * 2 + 5 + 3 * 2);
        expect(estimatedCallsPerContact(resolveDispatchTuning({ maxCallAttempts: 5 }))).toBe(4 * 2 + 5 + 5 * 2);
    });

    it('charges workspace calls only for contacts that need a lookup, and bearer calls once per dispatch', () => {
        const contacts = [aContact(), aContact({ index: 1 }), aContact({ index: 2, outcome: 'invalidPhone' })];

        expect(estimateCallBudget(contacts, { roster: 2, customFields: 1 }, 0, DEFAULT_DISPATCH_TUNING)).toEqual({
            workspace: 2 + 2 * PER_CONTACT,
            bearer: 1 + 1 + 36 + 1 + 1,
            total: 2 + 2 * PER_CONTACT + 40,
        });
    });

    it('counts the audience polls of the tuning it is given', () => {
        const slowPolls = resolveDispatchTuning({ audienceReadyTimeoutMs: 60_000, audiencePollIntervalMs: 10_000 });

        expect(estimateCallBudget([aContact()], { roster: 1, customFields: 1 }, 0, slowPolls).bearer).toBe(1 + 1 + 6 + 1 + 1);
    });

    it("charges the plan's universe count once and, per run, its own count and its pages", () => {
        const withoutExclusion = estimateCallBudget([aContact()], { roster: 1, customFields: 1 }, 0, DEFAULT_DISPATCH_TUNING);
        const withExclusion = estimateCallBudget([aContact()], { roster: 1, customFields: 1 }, 3, DEFAULT_DISPATCH_TUNING);

        expect(withExclusion.bearer - withoutExclusion.bearer).toBe(1 + (1 + 3) * EXCLUSION_RUNS_PER_DISPATCH);
        expect(withExclusion.workspace).toBe(withoutExclusion.workspace);
        expect(withExclusion.total).toBe(withExclusion.workspace + withExclusion.bearer);
    });
});

describe('callBudgetOf', () => {
    const estimate = { workspace: 30, bearer: 10, total: 40 };
    const tuning = resolveDispatchTuning({ dailyCallQuota: 20_000 });

    it('reports what is left of the estimate against the quota of the tuning the job was planned with', () => {
        expect(callBudgetOf({ callEstimate: estimate, callsSpent: 12, tuning })).toEqual({
            estimate,
            spent: 12,
            remaining: 28,
            dailyCallQuota: 20_000,
        });
    });

    it('reports the default quota for a job planned before the tuning was stored', () => {
        expect(callBudgetOf({ callEstimate: estimate, callsSpent: 0 }).dailyCallQuota).toBe(DEFAULT_DISPATCH_TUNING.dailyCallQuota);
    });

    it('never reports a negative remainder, since the estimate is not a ceiling', () => {
        expect(callBudgetOf({ callEstimate: estimate, callsSpent: 41, tuning }).remaining).toBe(0);
    });
});
