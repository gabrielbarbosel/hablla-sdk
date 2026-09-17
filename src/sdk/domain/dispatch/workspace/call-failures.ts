/**
 * The one classification of failed call results shared by lookups, writes and
 * reconciliations, plus the retry bookkeeping every contact follows.
 */

import type { CallResult } from '../../../core/call-executor';
import type { AuthStrategy } from '../../../core/strategy';
import type { ContactFailure, ContactOutcome, DispatchContact } from './types';
import { CALL_RETRY_DELAY_MS, FAILURE_DETAIL_MAX_LENGTH, MAX_CALL_ATTEMPTS } from './constants';

/** Why a block of calls must stop: the gateway throttled, or the network failed a whole wave. */
export type StopCause = 'throttled' | 'interrupted';

/**
 * What failed in a contact's results, in precedence order:
 * - `stopBlock`: a call was throttled or a wave was interrupted; nothing is consumed.
 * - `tokenRejected`: a 401/403; the token itself is refused.
 * - `outcomeUnknown`: a 5xx or a transport failure; the request may have been applied.
 *   It outranks a sibling call that was never sent, because an unknown outcome has to be
 *   resolved while a call that was not sent only has to be repeated.
 * - `rejected`: another non-2xx; the request was refused and not applied.
 */
export type CallFailure =
    | { kind: 'stopBlock'; cause: StopCause }
    | { kind: 'tokenRejected'; strategy: AuthStrategy }
    | { kind: 'outcomeUnknown'; failure: ContactFailure }
    | { kind: 'rejected'; failure: ContactFailure };

/**
 * Resolution of a failure for a contact, shared by every contact step. `stopBlock` and
 * `tokenRejected` may carry the contact state to persist when a step must undo or keep
 * its write-ahead.
 */
export type CallFailureResolution =
    | { kind: 'retryLater'; contact: DispatchContact }
    | { kind: 'tokenRejected'; strategy: AuthStrategy; contact?: DispatchContact }
    | { kind: 'stopBlock'; cause: StopCause; contact?: DispatchContact };

/** Result of a finished contact step: an updated contact, or a failure resolution. */
export type ContactResolution = { kind: 'decided'; contact: DispatchContact } | CallFailureResolution;

/** Status range of a successful response. */
const SUCCESS_STATUS_MIN = 200;
const SUCCESS_STATUS_MAX = 299;

/** Statuses that mean the token was refused. */
const TOKEN_REJECTED_STATUSES: readonly number[] = [401, 403];

/** First status of the server-error range. */
const SERVER_ERROR_STATUS_MIN = 500;

/** True for a completed 2xx result. */
export function isSuccess(result: CallResult): boolean {
    return result.kind === 'completed' && result.status >= SUCCESS_STATUS_MIN && result.status <= SUCCESS_STATUS_MAX;
}

/**
 * Classifies a contact's results; `undefined` when every result is a 2xx. The strategy
 * is the one the contact's calls were pinned to.
 */
export function classifyCallFailures(results: readonly CallResult[], strategy: AuthStrategy): CallFailure | undefined {
    if (results.some((result) => result.kind === 'throttled')) {
        return { kind: 'stopBlock', cause: 'throttled' };
    }

    if (results.some((result) => result.kind === 'interrupted')) {
        return { kind: 'stopBlock', cause: 'interrupted' };
    }

    if (results.some((result) => result.kind === 'completed' && TOKEN_REJECTED_STATUSES.includes(result.status))) {
        return { kind: 'tokenRejected', strategy };
    }

    const unknownOutcome = results.find((result) => result.kind === 'transportFailed' || (result.kind === 'completed' && result.status >= SERVER_ERROR_STATUS_MIN));

    if (unknownOutcome) {
        return { kind: 'outcomeUnknown', failure: failureOf(unknownOutcome) };
    }

    if (results.some((result) => result.kind === 'unsent')) {
        return { kind: 'stopBlock', cause: 'throttled' };
    }

    const refused = results.find((result) => !isSuccess(result));

    if (refused) {
        return { kind: 'rejected', failure: failureOf(refused) };
    }

    return undefined;
}

/**
 * Spends one attempt on a retryable failure: the contact waits `CALL_RETRY_DELAY_MS`
 * (never retried in the same round), or takes `exhaustedOutcome` once
 * `MAX_CALL_ATTEMPTS` is reached.
 */
export function spendAttempt(contact: DispatchContact, failure: ContactFailure, exhaustedOutcome: ContactOutcome, now: number): ContactResolution {
    const attempts = contact.attempts + 1;

    if (attempts >= MAX_CALL_ATTEMPTS) {
        return { kind: 'decided', contact: { ...contact, attempts, outcome: exhaustedOutcome, failure, retryNotBefore: undefined } };
    }

    return { kind: 'retryLater', contact: { ...contact, attempts, failure, retryNotBefore: now + CALL_RETRY_DELAY_MS } };
}

/** A contact that ends in a terminal failure outcome. */
export function failContact(contact: DispatchContact, outcome: ContactOutcome, failure: ContactFailure): DispatchContact {
    return { ...contact, outcome, failure, retryNotBefore: undefined };
}

/** Failure record of a non-successful result. */
function failureOf(result: CallResult): ContactFailure {
    if (result.kind === 'completed') {
        return { status: result.status, detail: truncateDetail(JSON.stringify(result.data) ?? '') };
    }

    if (result.kind === 'transportFailed' || result.kind === 'interrupted') {
        return { status: 'transport', detail: truncateDetail(result.message) };
    }

    return { status: 'transport', detail: result.kind };
}

/** Caps a failure detail at `FAILURE_DETAIL_MAX_LENGTH`. */
export function truncateDetail(detail: string): string {
    return detail.slice(0, FAILURE_DETAIL_MAX_LENGTH);
}

/** Payload of a completed result; `undefined` for results without a response. */
export function payloadOf(result: CallResult): unknown {
    return result.kind === 'completed' ? result.data : undefined;
}
