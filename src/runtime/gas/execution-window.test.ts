import { describe, it, expect } from 'vitest';
import { GAS_EXECUTION_LIMIT_MS, LEASE_MARGIN_MS, executionWindow } from './execution-window';

describe('executionWindow', () => {
    it('anchors the deadline and the lease at the start of the execution', () => {
        expect(executionWindow(1_000, 300_000)).toEqual({ deadlineAt: 301_000, leaseUntil: 1_000 + GAS_EXECUTION_LIMIT_MS + LEASE_MARGIN_MS });
    });

    it.each([0, -1, 1.5, GAS_EXECUTION_LIMIT_MS, GAS_EXECUTION_LIMIT_MS + 1])('refuses a budget of %s', (budgetMs) => {
        expect(() => executionWindow(1_000, budgetMs)).toThrow(RangeError);
    });
});
