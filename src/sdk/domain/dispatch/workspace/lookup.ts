/**
 * The two-stage contact lookup, used both for the preview and right before a contact's
 * writes: persons by phone first, then open attendances of the person found (an
 * attendance always has a person, so a new contact skips the second stage).
 */

import type { CallResult, HttpCall } from '../../../core/call-executor';
import type { PhoneVariants } from '../../../utils';
import type { PersonSnapshot } from './owner-policy';
import type { StoredPhone } from './payloads';
import type { DispatchContact, DispatchSettings, LookupPurpose } from './types';
import type { ContactResolution } from './call-failures';
import { matchesPhone } from '../../../utils';
import { classifyCallFailures, failContact, payloadOf, spendAttempt } from './call-failures';
import { OPEN_ATTENDANCE_STATUSES } from './constants';
import { requirePhone, requireTarget } from './requirements';
import { decideOwnerChange } from './owner-policy';
import { toAttendanceStatus, toPayloadPage, toPersonSnapshot } from './payloads';
import { findOpenAttendances, findPersonsByPhone } from './routes';

/** Outcome of the person stage: decided, or the one person whose attendances must be checked. */
export type PersonLookupResolution = ContactResolution | { kind: 'checkAttendance'; person: PersonSnapshot };

/** Outcome of the attendance stage. */
export type AttendanceLookupResolution = ContactResolution;

/** One person search per distinct shape of the contact's phone. */
export function personLookupCalls(contact: DispatchContact): HttpCall[] {
    return phoneShapes(contact).map((shape) => findPersonsByPhone(shape));
}

/** One attendance search per stored phone of the person that matches the contact's phone. */
export function attendanceLookupCalls(person: PersonSnapshot, contact: DispatchContact, connectionId: string): HttpCall[] {
    const matching = matchingStoredPhones(person, requirePhone(contact));

    return [...new Set(matching.map((storedPhone) => storedPhone.digits))].map((digits) => findOpenAttendances(connectionId, digits));
}

/**
 * Resolves the person stage. Two or more persons holding the phone are
 * `duplicatePersons`, a blocked one is `blocked`, one whose matching phones are all
 * declared as not being on WhatsApp is `noWhatsapp` (the campaign resolves its audience
 * with the WhatsApp filter, so such a person would never match the count), a single usable
 * one needs the attendance stage, and none makes the contact `ready` for creation. A phone
 * that leaves `is_whatsapp` undeclared is not a declared no, so it goes on and the
 * campaign's own filter decides.
 */
export function resolvePersonLookup(contact: DispatchContact, results: readonly CallResult[], purpose: LookupPurpose, now: number): PersonLookupResolution {
    const failure = resolveLookupFailure(contact, results, now);

    if (failure) {
        return failure;
    }

    const phone = requirePhone(contact);
    const persons = new Map<string, PersonSnapshot>();

    for (const result of results) {
        for (const raw of toPayloadPage(payloadOf(result), 'person search').results) {
            const person = toPersonSnapshot(raw);

            if (matchingStoredPhones(person, phone).length > 0) {
                persons.set(person.id, person);
            }
        }
    }

    if (persons.size > 1) {
        return { kind: 'decided', contact: { ...settledLookup(contact, purpose, now), outcome: 'duplicatePersons' } };
    }

    const [person] = persons.values();

    if (!person) {
        return { kind: 'decided', contact: { ...settledLookup(contact, purpose, now), outcome: 'ready', person: undefined, ownerChange: undefined } };
    }

    if (person.isBlocked) {
        return { kind: 'decided', contact: { ...settledLookup(contact, purpose, now), outcome: 'blocked' } };
    }

    if (matchingStoredPhones(person, phone).every((storedPhone) => storedPhone.isWhatsapp === false)) {
        return { kind: 'decided', contact: { ...settledLookup(contact, purpose, now), outcome: 'noWhatsapp' } };
    }

    return { kind: 'checkAttendance', person };
}

/**
 * Resolves the attendance stage by each returned item's own status (the `statuses`
 * filter is not trusted). An open attendance makes the contact `inAttendance`; otherwise
 * it is `ready` with the existing person and the owner change decided now.
 */
export function resolveAttendanceLookup(contact: DispatchContact, person: PersonSnapshot, results: readonly CallResult[], settings: DispatchSettings, purpose: LookupPurpose, now: number): AttendanceLookupResolution {
    const failure = resolveLookupFailure(contact, results, now);

    if (failure) {
        return failure;
    }

    const hasOpenAttendance = results.some((result) => toPayloadPage(payloadOf(result), 'attendance search').results
        .map(toAttendanceStatus)
        .some((attendance) => OPEN_ATTENDANCE_STATUSES.includes(attendance.status)));

    if (hasOpenAttendance) {
        return { kind: 'decided', contact: { ...settledLookup(contact, purpose, now), outcome: 'inAttendance' } };
    }

    return {
        kind: 'decided',
        contact: {
            ...settledLookup(contact, purpose, now),
            outcome: 'ready',
            person: { id: person.id, existed: true },
            ownerChange: decideOwnerChange(person, requireTarget(contact), settings),
        },
    };
}

/** Failure handling of a lookup stage; `undefined` when every call succeeded. */
function resolveLookupFailure(contact: DispatchContact, results: readonly CallResult[], now: number): ContactResolution | undefined {
    const failure = classifyCallFailures(results);

    switch (failure?.kind) {
        case undefined:
            return undefined;
        case 'stopBlock':
        case 'tokenRejected':
            return failure;
        case 'outcomeUnknown':
            return spendAttempt(contact, failure.failure, 'lookupFailed', now);
        case 'rejected':
            return { kind: 'decided', contact: failContact(contact, 'lookupFailed', failure.failure) };
    }
}

/** The contact with the bookkeeping of a completed lookup. */
function settledLookup(contact: DispatchContact, purpose: LookupPurpose, now: number): DispatchContact {
    return { ...contact, resolvedAt: now, lookupPurpose: purpose, attempts: 0, retryNotBefore: undefined, failure: undefined };
}

/** The person's stored phones that are the contact's phone. */
function matchingStoredPhones(person: PersonSnapshot, phone: PhoneVariants): StoredPhone[] {
    return person.phones.filter((storedPhone) => matchesPhone(storedPhone.digits, phone));
}

/** Both shapes of the contact's phone, without repeats. */
export function phoneShapes(contact: DispatchContact): string[] {
    const phone = requirePhone(contact);

    return [...new Set([phone.digits, phone.alternate])];
}
