import { describe, it, expect } from 'vitest';
import { ESTIMATED_CALLS_PER_CONTACT, EXCLUSION_RUNS_PER_DISPATCH, callBudgetOf, estimateCallBudget } from './call-budget';
import { aContact } from './__fixtures__/builders';

describe('estimateCallBudget', () => {
    it('counts both lookups, the longest write plan and the retries of the largest step per contact', () => {
        expect(ESTIMATED_CALLS_PER_CONTACT).toBe(4 * 2 + 5 + 3 * 2);
    });

    it('charges workspace calls only for contacts that need a lookup, and bearer calls once per dispatch', () => {
        const contacts = [aContact(), aContact({ index: 1 }), aContact({ index: 2, outcome: 'invalidPhone' })];

        expect(estimateCallBudget(contacts, { roster: 2, customFields: 1 }, 0)).toEqual({
            workspace: 2 + 2 * ESTIMATED_CALLS_PER_CONTACT,
            bearer: 1 + 1 + 36 + 1 + 1,
            total: 2 + 2 * ESTIMATED_CALLS_PER_CONTACT + 40,
        });
    });

    it("charges the plan's universe count once and, per run, its own count and its pages", () => {
        const withoutExclusion = estimateCallBudget([aContact()], { roster: 1, customFields: 1 }, 0);
        const withExclusion = estimateCallBudget([aContact()], { roster: 1, customFields: 1 }, 3);

        expect(withExclusion.bearer - withoutExclusion.bearer).toBe(1 + (1 + 3) * EXCLUSION_RUNS_PER_DISPATCH);
        expect(withExclusion.workspace).toBe(withoutExclusion.workspace);
        expect(withExclusion.total).toBe(withExclusion.workspace + withExclusion.bearer);
    });
});

describe('callBudgetOf', () => {
    const estimate = { workspace: 30, bearer: 10, total: 40 };

    it('reports what is left of the estimate against the quota it was checked with', () => {
        expect(callBudgetOf({ callEstimate: estimate, callsSpent: 12 }, 20_000)).toEqual({
            estimate,
            spent: 12,
            remaining: 28,
            dailyCallQuota: 20_000,
        });
    });

    it('never reports a negative remainder, since the estimate is not a ceiling', () => {
        expect(callBudgetOf({ callEstimate: estimate, callsSpent: 41 }, 20_000).remaining).toBe(0);
    });
});
