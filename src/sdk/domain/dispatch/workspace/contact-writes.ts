/**
 * The writes that bring one contact into the audience, planned deterministically from
 * its persisted state (the plan itself is never stored), with their calls and the
 * handling of their results. `joinAudience` is always the last write. A created person is
 * stored with `phoneIdentity`, which is the operator's number in its canonical shape and
 * never a number the dispatch made up (see {@link phoneIdentity}).
 */

import type { CallResult, HttpCall } from '../../../core/call-executor';
import type { ContactResolution, StopCause } from './call-failures';
import type { DispatchContact, DispatchJob, PendingWrite } from './types';
import { phoneIdentity } from '../../../utils';
import { classifyCallFailures, failContact, payloadOf, spendAttempt, truncateDetail } from './call-failures';
import { RECONCILIATION_DELAY_MS } from './constants';
import { requireOwnerChange, requirePerson, requirePhone, requireTarget } from './contact-requirements';
import { UnexpectedPayloadError } from './errors';
import { toCreatedId } from './payloads';
import { addPersonOwners, addSegmentationItem, createPerson, removePersonFollowers, removePersonOwners, updatePerson } from './routes';

/** One write of a contact's plan. */
export type ContactWrite =
    | { kind: 'createPerson' }
    | { kind: 'setFirstName' }
    | { kind: 'unfollowTarget' }
    | { kind: 'addTargetOwner' }
    | { kind: 'removeSystemOwners'; userIds: readonly string[] }
    | { kind: 'joinAudience' };

/** A write that is not idempotent, so its intent is persisted before sending and reconciled when its outcome is lost. */
export type WriteAheadWrite = Extract<ContactWrite, { kind: PendingWrite }>;

/** Phone type of a person created by the dispatch. */
const CREATED_PHONE_TYPE = 'personal';

/**
 * The writes of a contact. A new person (no person yet, or one this dispatch created) is
 * `[createPerson, joinAudience]`, so after the create the next write is the join. An
 * existing person gets the first name, then the owner change it was resolved with, then
 * the join.
 */
export function planContactWrites(contact: DispatchContact): ContactWrite[] {
    if (!contact.person || !contact.person.existed) {
        return [{ kind: 'createPerson' }, { kind: 'joinAudience' }];
    }

    const writes: ContactWrite[] = [{ kind: 'setFirstName' }];
    const ownerChange = requireOwnerChange(contact);

    if (ownerChange.kind !== 'keep') {
        if (ownerChange.unfollowFirst) {
            writes.push({ kind: 'unfollowTarget' });
        }

        writes.push({ kind: 'addTargetOwner' });

        if (ownerChange.kind === 'replaceSystemOwners') {
            writes.push({ kind: 'removeSystemOwners', userIds: ownerChange.removedOwnerIds });
        }
    }

    writes.push({ kind: 'joinAudience' });

    return writes;
}

/** True for the writes that need a write-ahead marker. */
export function isWriteAhead(write: ContactWrite): write is WriteAheadWrite {
    return write.kind === 'createPerson' || write.kind === 'joinAudience';
}

/** The contact with the write-ahead marker of a non-idempotent write, persisted before sending it. */
export function withWriteAhead(contact: DispatchContact, write: WriteAheadWrite): DispatchContact {
    return {
        ...contact,
        pendingWrite: write.kind,
        createSends: write.kind === 'createPerson' ? contact.createSends + 1 : contact.createSends,
    };
}

/** The HTTP call of a write. */
export function writeCallFor(write: ContactWrite, contact: DispatchContact, job: DispatchJob): HttpCall {
    const settings = job.settings;

    switch (write.kind) {
        case 'createPerson':
            return createPerson({
                name: contact.name.toLocaleUpperCase('pt-BR'),
                phones: [{ phone: phoneIdentity(requirePhone(contact)), is_whatsapp: true, type: CREATED_PHONE_TYPE }],
                users: [requireTarget(contact).userId],
                sectors: [settings.sectorId],
                custom_fields: [
                    { custom_field: settings.firstNameFieldId, value: contact.firstName },
                    ...Object.entries(contact.customFields).map(([customField, value]) => ({ custom_field: customField, value })),
                ],
            });
        case 'setFirstName':
            return updatePerson(requirePerson(contact).id, { custom_fields: [{ custom_field: settings.firstNameFieldId, value: contact.firstName }] });
        case 'unfollowTarget':
            return removePersonFollowers(requirePerson(contact).id, [requireTarget(contact).userId]);
        case 'addTargetOwner':
            return addPersonOwners(requirePerson(contact).id, [requireTarget(contact).userId]);
        case 'removeSystemOwners':
            return removePersonOwners(requirePerson(contact).id, write.userIds);
        case 'joinAudience':
            return addSegmentationItem(requireSegmentationId(job), requirePerson(contact).id);
    }
}

/**
 * Applies a write's result. A 2xx advances the plan (`createPerson` records the created
 * person, `joinAudience` records the item and makes the contact `inAudience`). A refusal
 * (4xx) was not applied and fails the contact. A throttled or unsent call was not
 * processed and undoes its write-ahead. An unknown outcome (5xx, transport failure,
 * interrupted wave) retries an idempotent write later, and keeps the write-ahead marker of
 * a non-idempotent one so its next step is a reconciliation, never a blind re-send.
 */
export function applyWriteResult(contact: DispatchContact, write: ContactWrite, results: readonly CallResult[], now: number): ContactResolution {
    const failure = classifyCallFailures(results);

    switch (failure?.kind) {
        case undefined:
            return applyConfirmedWrite(contact, write, results[0]!);
        case 'stopBlock':
            return stopWrite(contact, write, failure.cause, now);
        case 'tokenRejected':
            return { kind: 'tokenRejected', contact: isWriteAhead(write) ? undoWriteAhead(contact, write) : undefined };
        case 'rejected':
            return { kind: 'decided', contact: failContact(clearWriteAhead(contact), 'writeFailed', failure.failure) };
        case 'outcomeUnknown':
            if (isWriteAhead(write)) {
                return { kind: 'retryLater', contact: awaitReconciliation({ ...contact, attempts: contact.attempts + 1, failure: failure.failure }, now) };
            }
            return spendAttempt(contact, failure.failure, 'writeFailed', now);
    }
}

/** A confirmed write advances the plan. */
function applyConfirmedWrite(contact: DispatchContact, write: ContactWrite, result: CallResult): ContactResolution {
    const advanced: DispatchContact = { ...clearWriteAhead(contact), writesDone: contact.writesDone + 1, attempts: 0, failure: undefined, retryNotBefore: undefined };

    if (write.kind !== 'createPerson' && write.kind !== 'joinAudience') {
        return { kind: 'decided', contact: advanced };
    }

    const createdId = createdIdOf(result, write.kind);

    if (createdId === undefined) {
        return { kind: 'decided', contact: failContact(clearWriteAhead(contact), 'writeFailed', { status: statusOf(result), detail: truncateDetail(`${write.kind} response has no id`) }) };
    }

    if (write.kind === 'createPerson') {
        return { kind: 'decided', contact: { ...advanced, person: { id: createdId, existed: false } } };
    }

    return { kind: 'decided', contact: { ...advanced, audienceItemId: createdId, outcome: 'inAudience' } };
}

/** A stopped write: throttled calls were not processed; interrupted ones have an unknown outcome. */
function stopWrite(contact: DispatchContact, write: ContactWrite, cause: StopCause, now: number): ContactResolution {
    if (!isWriteAhead(write)) {
        return { kind: 'stopBlock', cause };
    }

    if (cause === 'throttled') {
        return { kind: 'stopBlock', cause, contact: undoWriteAhead(contact, write) };
    }

    return { kind: 'stopBlock', cause, contact: awaitReconciliation(contact, now) };
}

/** The contact waiting to reconcile its pending write. */
export function awaitReconciliation(contact: DispatchContact, now: number): DispatchContact {
    return { ...contact, retryNotBefore: now + RECONCILIATION_DELAY_MS };
}

/** Removes the write-ahead marker and gives back the create send that never happened. */
function undoWriteAhead(contact: DispatchContact, write: WriteAheadWrite): DispatchContact {
    return {
        ...clearWriteAhead(contact),
        createSends: write.kind === 'createPerson' ? contact.createSends - 1 : contact.createSends,
    };
}

/** The contact without a write-ahead marker. */
export function clearWriteAhead(contact: DispatchContact): DispatchContact {
    return { ...contact, pendingWrite: undefined };
}

/** The id of a created person or segmentation item, or `undefined` when the response lacks it. */
function createdIdOf(result: CallResult, payload: string): string | undefined {
    try {
        return toCreatedId(payloadOf(result), payload);
    } catch (error) {
        if (error instanceof UnexpectedPayloadError) {
            return undefined;
        }
        throw error;
    }
}

/** The HTTP status of a completed result. */
function statusOf(result: CallResult): number | 'transport' {
    return result.kind === 'completed' ? result.status : 'transport';
}

/**
 * The job's segmentation id; set by `start` before any write.
 *
 * @throws Error when the job has no segmentation (a planning bug).
 */
export function requireSegmentationId(job: DispatchJob): string {
    if (!job.segmentationId) {
        throw new Error(`Dispatch job ${job.id} has no segmentation`);
    }

    return job.segmentationId;
}
