import { describe, it, expect } from 'vitest';
import { evaluateGuards, GuardMetrics } from './guard';

const HEALTHY: GuardMetrics = {
    parseOk: true,
    operationCount: 700,
    multipartCount: 7,
    apiClientFound: true,
    workspaceAliasCount: 400,
    enumIssues: [],
};

describe('evaluateGuards', () => {
    it('passes a healthy extraction', () => {
        expect(evaluateGuards(HEALTHY)).toMatchObject({ ok: true, anomaly: false, reasons: [] });
    });

    it('trips on enum naming issues so a public enum is never renamed silently', () => {
        const issue = 'enum alias ConnectionChannel matched 0 value-sets (expected exactly 1)';
        const result = evaluateGuards({ ...HEALTHY, enumIssues: [issue] });
        expect(result.ok).toBe(false);
        expect(result.reasons).toEqual([issue]);
    });
});
