import { describe, it, expect } from 'vitest';
import { DEFAULT_DISPATCH_TUNING, DISPATCH_TUNING_SPEC, resolveDispatchTuning, tuningOf, wavePacingOf, type DispatchTuning } from './tuning';

describe('DISPATCH_TUNING_SPEC', () => {
    it('keeps every default an integer inside its own bounds', () => {
        for (const [key, bound] of Object.entries(DISPATCH_TUNING_SPEC)) {
            expect(Number.isInteger(bound.default), key).toBe(true);
            expect(bound.min <= bound.default && bound.default <= bound.max, key).toBe(true);
        }
    });

    it('keeps the measured floors and the protocol ceilings', () => {
        expect(DISPATCH_TUNING_SPEC.variableSettleMs.min).toBe(60_000);
        expect(DISPATCH_TUNING_SPEC.throttleCooldownMs.min).toBe(60_000);
        expect(DISPATCH_TUNING_SPEC.exclusionPageLimit.max).toBe(1_000);
        expect(DISPATCH_TUNING_SPEC.executionBudgetMs.max).toBeLessThan(360_000);
    });

    it('defaults to small paced waves instead of bursts', () => {
        expect(DEFAULT_DISPATCH_TUNING).toMatchObject({ waveConcurrency: 8, wavePauseMs: 250 });
    });
});

describe('resolveDispatchTuning', () => {
    it('applies every default when nothing is overridden', () => {
        expect(resolveDispatchTuning({})).toEqual(DEFAULT_DISPATCH_TUNING);
        expect(Object.keys(DEFAULT_DISPATCH_TUNING)).toEqual(Object.keys(DISPATCH_TUNING_SPEC));
    });

    it('keeps the overrides and the defaults of the keys left out or undefined', () => {
        const tuning = resolveDispatchTuning({ waveConcurrency: 4, wavePauseMs: 0, dailyCallQuota: 20_000, maxCallAttempts: undefined });

        expect(tuning).toEqual({ ...DEFAULT_DISPATCH_TUNING, waveConcurrency: 4, wavePauseMs: 0, dailyCallQuota: 20_000 });
        expect(Object.isFrozen(tuning)).toBe(true);
    });

    it('accepts both ends of every range', () => {
        const atMin = Object.fromEntries(Object.entries(DISPATCH_TUNING_SPEC).map(([key, bound]) => [key, bound.min])) as unknown as DispatchTuning;

        expect(resolveDispatchTuning({ variableSettleMs: 60_000, exclusionPageLimit: 1_000, executionBudgetMs: 330_000 })).toMatchObject({ variableSettleMs: 60_000, executionBudgetMs: 330_000 });
        expect(resolveDispatchTuning(atMin)).toEqual(atMin);
    });

    it('reports every value out of bounds or not an integer in one RangeError', () => {
        const resolve = (): DispatchTuning => resolveDispatchTuning({ waveConcurrency: 0, wavePauseMs: 1.5, variableSettleMs: 59_999, exclusionPageLimit: 1_001, dailyCallQuota: Number.NaN });

        expect(resolve).toThrow(RangeError);
        expect(resolve).toThrow(/waveConcurrency must be an integer from 1 to 100, got 0/);
        expect(resolve).toThrow(/wavePauseMs must be an integer from 0 to 10000, got 1.5/);
        expect(resolve).toThrow(/variableSettleMs must be an integer from 60000 to 600000, got 59999/);
        expect(resolve).toThrow(/exclusionPageLimit must be an integer from 1 to 1000, got 1001/);
        expect(resolve).toThrow(/dailyCallQuota must be an integer from 1 to 100000, got NaN/);
    });

    it('refuses overrides that are not an object', () => {
        expect(() => resolveDispatchTuning(undefined as unknown as Partial<DispatchTuning>)).toThrow(TypeError);
    });

    it('refuses a value that is not a number', () => {
        expect(() => resolveDispatchTuning({ waveConcurrency: '8' as unknown as number })).toThrow(/waveConcurrency must be an integer/);
    });

    it('refuses an unknown key together with the bad values', () => {
        const resolve = (): DispatchTuning => resolveDispatchTuning({ concurrency: 8, waveConcurrency: 0 } as Partial<DispatchTuning>);

        expect(resolve).toThrow(/concurrency is not a dispatch tunable/);
        expect(resolve).toThrow(/waveConcurrency must be an integer/);
    });

    it('refuses a tuning whose largest round could never fit in the execution budget', () => {
        expect(() => resolveDispatchTuning({ chunkTimeReserveMs: 200_000, executionBudgetMs: 150_000 })).toThrow(/must be below executionBudgetMs \(150000\)/);
        expect(() => resolveDispatchTuning({ waveConcurrency: 1, wavePauseMs: 10_000 })).toThrow(/wave pauses of the largest round/);
        expect(resolveDispatchTuning({ waveConcurrency: 1, wavePauseMs: 10_000, lookupChunkSize: 5, writeChunkSize: 5 })).toMatchObject({ wavePauseMs: 10_000 });
    });
});

describe('tuningOf', () => {
    it('is the tuning the job was planned with', () => {
        const planned = resolveDispatchTuning({ throttleCooldownMs: 120_000 });

        expect(tuningOf({ tuning: planned })).toBe(planned);
    });

    it('is the default tuning for a job planned before v0.7.0, which stored none', () => {
        expect(tuningOf({})).toBe(DEFAULT_DISPATCH_TUNING);
    });
});

describe('wavePacingOf', () => {
    it('is the wave concurrency and pause of the tuning', () => {
        expect(wavePacingOf(resolveDispatchTuning({ waveConcurrency: 3, wavePauseMs: 500 }))).toEqual({ concurrency: 3, pauseMs: 500 });
    });
});
