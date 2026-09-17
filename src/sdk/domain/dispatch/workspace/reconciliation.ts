/**
 * Reconciliation of a non-idempotent write whose outcome was lost: read what Hablla holds
 * and either confirm the write or clear the marker so it is sent again, within bounds.
 */

import type { CallResult, HttpCall } from '../../../core/call-executor';
import type { ContactResolution } from './call-failures';
import type { DispatchContact, DispatchJob } from './types';
import { matchesPhone } from '../../../utils';
import { classifyCallFailures, failContact, payloadOf, spendAttempt } from './call-failures';
import { MAX_CALL_ATTEMPTS, MAX_CREATE_SENDS } from './constants';
import { requirePerson, requirePhone } from './contact-requirements';
import { clearWriteAhead, requireSegmentationId } from './contact-writes';
import { phoneShapes } from './lookup';
import { toPayloadPage, toPersonIdentity, toSegmentationItem } from './payloads';
import { findPersonsByPhoneFresh, findSegmentationItemsOfPerson } from './routes';

/** The strategy every reconciliation call is pinned to. */
const RECONCILIATION_STRATEGY = 'workspace';

/**
 * The reads that reveal a pending write's outcome: the v1 person listing by each phone
 * shape for a create (it sees a fresh create), the segmentation items of the person for
 * a join.
 */
export function reconciliationCalls(contact: DispatchContact, job: DispatchJob): HttpCall[] {
    if (contact.pendingWrite === 'createPerson') {
        return phoneShapes(contact).map((shape) => findPersonsByPhoneFresh(shape));
    }

    return [findSegmentationItemsOfPerson(requireSegmentationId(job), requirePerson(contact).id)];
}

/**
 * Applies the reconciliation reads. A create found once is confirmed (a person found is
 * taken as the created one); found twice is `duplicatePersons`; not found is sent again
 * while `MAX_CREATE_SENDS` allows, otherwise `writeFailed`. A join found is confirmed and
 * the contact is `inAudience`; not found is sent again while `MAX_CALL_ATTEMPTS` allows.
 */
export function applyReconciliation(contact: DispatchContact, results: readonly CallResult[], now: number): ContactResolution {
    const failure = classifyCallFailures(results, RECONCILIATION_STRATEGY);

    switch (failure?.kind) {
        case undefined:
            return contact.pendingWrite === 'createPerson' ? reconcileCreate(contact, results) : reconcileJoin(contact, results);
        case 'stopBlock':
        case 'tokenRejected':
            return failure;
        case 'outcomeUnknown':
            return spendAttempt(contact, failure.failure, 'writeFailed', now);
        case 'rejected':
            return { kind: 'decided', contact: failContact(contact, 'writeFailed', failure.failure) };
    }
}

/** Resolves a pending create from the persons holding the contact's phone. */
function reconcileCreate(contact: DispatchContact, results: readonly CallResult[]): ContactResolution {
    const phone = requirePhone(contact);
    const personIds = new Set<string>();

    for (const result of results) {
        for (const raw of toPayloadPage(payloadOf(result), 'person listing').results) {
            const person = toPersonIdentity(raw);

            if (person.phones.some((storedPhone) => matchesPhone(storedPhone.digits, phone))) {
                personIds.add(person.id);
            }
        }
    }

    if (personIds.size > 1) {
        return { kind: 'decided', contact: { ...clearWriteAhead(contact), outcome: 'duplicatePersons', retryNotBefore: undefined } };
    }

    const [personId] = personIds;

    if (personId !== undefined) {
        return { kind: 'decided', contact: confirmPendingWrite({ ...contact, person: { id: personId, existed: false } }) };
    }

    if (contact.createSends < MAX_CREATE_SENDS) {
        return { kind: 'decided', contact: { ...clearWriteAhead(contact), retryNotBefore: undefined } };
    }

    return {
        kind: 'decided',
        contact: failContact(contact, 'writeFailed', { status: 'transport', detail: `person not found after ${contact.createSends} create sends with lost responses` }),
    };
}

/** Resolves a pending join from the segmentation items of the contact's person. */
function reconcileJoin(contact: DispatchContact, results: readonly CallResult[]): ContactResolution {
    const personId = requirePerson(contact).id;
    const item = results
        .flatMap((result) => toPayloadPage(payloadOf(result), 'segmentation items').results.map(toSegmentationItem))
        .find((candidate) => candidate.person === personId);

    if (item) {
        return { kind: 'decided', contact: { ...confirmPendingWrite(contact), audienceItemId: item.id, outcome: 'inAudience' } };
    }

    if (contact.attempts < MAX_CALL_ATTEMPTS) {
        return { kind: 'decided', contact: { ...clearWriteAhead(contact), retryNotBefore: undefined } };
    }

    return {
        kind: 'decided',
        contact: failContact(contact, 'writeFailed', { status: 'transport', detail: `segmentation item not found after ${contact.attempts} joins with lost responses` }),
    };
}

/** The contact with its pending write confirmed: the plan advances and the retry state resets. */
function confirmPendingWrite(contact: DispatchContact): DispatchContact {
    return { ...clearWriteAhead(contact), writesDone: contact.writesDone + 1, attempts: 0, failure: undefined, retryNotBefore: undefined };
}
