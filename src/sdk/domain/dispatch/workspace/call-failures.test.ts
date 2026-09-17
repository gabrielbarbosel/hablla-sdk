import { describe, it, expect } from 'vitest';
import { classifyCallFailures, spendAttempt, truncateDetail } from './call-failures';
import { CALL_RETRY_DELAY_MS, FAILURE_DETAIL_MAX_LENGTH } from './constants';
import { aContact, completed } from './__fixtures__/builders';

const NOW = 1_800_000_000_000;

describe('classifyCallFailures', () => {
    it('returns undefined when every result is a 2xx', () => {
        expect(classifyCallFailures([completed(200), completed(201)], 'workspace')).toBeUndefined();
    });

    it('ranks a throttle above an interruption, a refused token, an unknown outcome, a call never sent and a refusal', () => {
        expect(classifyCallFailures([completed(401), { kind: 'interrupted', message: 'x' }, { kind: 'throttled' }], 'workspace')).toEqual({ kind: 'stopBlock', cause: 'throttled' });
        expect(classifyCallFailures([completed(401), { kind: 'interrupted', message: 'x' }], 'workspace')).toEqual({ kind: 'stopBlock', cause: 'interrupted' });
        expect(classifyCallFailures([completed(500), completed(403)], 'bearer')).toEqual({ kind: 'tokenRejected', strategy: 'bearer' });
        expect(classifyCallFailures([{ kind: 'transportFailed', message: 'reset' }, { kind: 'unsent' }], 'workspace')).toMatchObject({ kind: 'outcomeUnknown' });
        expect(classifyCallFailures([{ kind: 'throttled' }, { kind: 'transportFailed', message: 'reset' }], 'workspace')).toEqual({ kind: 'stopBlock', cause: 'throttled' });
        expect(classifyCallFailures([completed(404), completed(503, 'down')], 'workspace')).toEqual({ kind: 'outcomeUnknown', failure: { status: 503, detail: '"down"' } });
        expect(classifyCallFailures([completed(200), { kind: 'unsent' }], 'workspace')).toEqual({ kind: 'stopBlock', cause: 'throttled' });
        expect(classifyCallFailures([completed(200), completed(422, { message: 'invalid' })], 'workspace')).toEqual({ kind: 'rejected', failure: { status: 422, detail: '{"message":"invalid"}' } });
    });

    it('treats a single transport failure as an unknown outcome', () => {
        expect(classifyCallFailures([{ kind: 'transportFailed', message: 'reset' }], 'workspace')).toEqual({ kind: 'outcomeUnknown', failure: { status: 'transport', detail: 'reset' } });
    });
});

describe('spendAttempt', () => {
    const failure = { status: 500, detail: 'x' } as const;

    it('defers the contact until the retry delay has passed', () => {
        expect(spendAttempt(aContact(), failure, 'writeFailed', NOW)).toEqual({ kind: 'retryLater', contact: { ...aContact(), attempts: 1, failure, retryNotBefore: NOW + CALL_RETRY_DELAY_MS } });
    });

    it('ends in the exhausted outcome on the last attempt', () => {
        expect(spendAttempt(aContact({ attempts: 2 }), failure, 'writeFailed', NOW)).toEqual({ kind: 'decided', contact: { ...aContact(), attempts: 3, outcome: 'writeFailed', failure, retryNotBefore: undefined } });
    });
});

describe('truncateDetail', () => {
    it('caps the detail length', () => {
        expect(truncateDetail('x'.repeat(FAILURE_DETAIL_MAX_LENGTH + 10))).toHaveLength(FAILURE_DETAIL_MAX_LENGTH);
    });
});
