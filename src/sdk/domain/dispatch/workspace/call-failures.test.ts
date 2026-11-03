import { describe, it, expect } from 'vitest';
import { classifyCallFailures, rejectedTokenStrategy, spendAttempt, truncateDetail } from './call-failures';
import { listCustomFieldsPage, listUsersPage } from './routes';
import { DEFAULT_DISPATCH_TUNING } from './tuning';
import { aContact, completed } from './__fixtures__/builders';

const NOW = 1_800_000_000_000;

describe('classifyCallFailures', () => {
    it('returns undefined when every result is a 2xx', () => {
        expect(classifyCallFailures([completed(200), completed(201)], DEFAULT_DISPATCH_TUNING)).toBeUndefined();
    });

    it('ranks a throttle above an interruption, a refused token, an unknown outcome, a call never sent and a refusal', () => {
        expect(classifyCallFailures([completed(401), { kind: 'interrupted', message: 'x' }, { kind: 'throttled' }], DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'stopBlock', cause: 'throttled' });
        expect(classifyCallFailures([completed(401), { kind: 'interrupted', message: 'x' }], DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'stopBlock', cause: 'interrupted' });
        expect(classifyCallFailures([completed(500), completed(403)], DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'tokenRejected' });
        expect(classifyCallFailures([{ kind: 'transportFailed', message: 'reset' }, { kind: 'unsent' }], DEFAULT_DISPATCH_TUNING)).toMatchObject({ kind: 'outcomeUnknown' });
        expect(classifyCallFailures([{ kind: 'throttled' }, { kind: 'transportFailed', message: 'reset' }], DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'stopBlock', cause: 'throttled' });
        expect(classifyCallFailures([completed(404), completed(503, 'down')], DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'outcomeUnknown', failure: { status: 503, detail: '"down"' } });
        expect(classifyCallFailures([completed(200), { kind: 'unsent' }], DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'stopBlock', cause: 'throttled' });
        expect(classifyCallFailures([completed(200), completed(422, { message: 'invalid' })], DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'rejected', failure: { status: 422, detail: '{"message":"invalid"}' } });
    });

    it('treats a single transport failure as an unknown outcome', () => {
        expect(classifyCallFailures([{ kind: 'transportFailed', message: 'reset' }], DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'outcomeUnknown', failure: { status: 'transport', detail: 'reset' } });
    });
});

describe('rejectedTokenStrategy', () => {
    it('names the token of the call that was refused, not of the whole step', () => {
        expect(rejectedTokenStrategy([listUsersPage(1, DEFAULT_DISPATCH_TUNING.catalogPageLimit), listCustomFieldsPage(1, DEFAULT_DISPATCH_TUNING.catalogPageLimit)], [completed(200), completed(403)])).toBe('bearer');
        expect(rejectedTokenStrategy([listCustomFieldsPage(1, DEFAULT_DISPATCH_TUNING.catalogPageLimit), listUsersPage(1, DEFAULT_DISPATCH_TUNING.catalogPageLimit)], [completed(200), completed(401)])).toBe('workspace');
    });

    it('throws when no call was refused', () => {
        expect(() => rejectedTokenStrategy([listUsersPage(1, DEFAULT_DISPATCH_TUNING.catalogPageLimit)], [completed(200)])).toThrow(/refused/);
    });
});

describe('spendAttempt', () => {
    const failure = { status: 500, detail: 'x' } as const;

    it('defers the contact until the retry delay has passed', () => {
        expect(spendAttempt(aContact(), failure, 'writeFailed', NOW, DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'retryLater', contact: { ...aContact(), attempts: 1, failure, retryNotBefore: NOW + DEFAULT_DISPATCH_TUNING.callRetryDelayMs } });
    });

    it('ends in the exhausted outcome on the last attempt', () => {
        expect(spendAttempt(aContact({ attempts: 2 }), failure, 'writeFailed', NOW, DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'decided', contact: { ...aContact(), attempts: 3, outcome: 'writeFailed', failure, retryNotBefore: undefined } });
    });
});

describe('truncateDetail', () => {
    it('caps the detail length', () => {
        expect(truncateDetail('x'.repeat(DEFAULT_DISPATCH_TUNING.failureDetailMaxLength + 10), DEFAULT_DISPATCH_TUNING.failureDetailMaxLength)).toHaveLength(DEFAULT_DISPATCH_TUNING.failureDetailMaxLength);
    });
});
