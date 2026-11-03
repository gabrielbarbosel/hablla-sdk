/**
 * The two-stage contact lookup, used both for the preview and right before a contact's
 * writes: persons by phone first, then open attendances of the person found (an
 * attendance always has a person, so a new contact skips the second stage).
 */

import type { CallResult, HttpCall } from '../../../core/call-executor';
import type { PhoneVariants } from '../../../utils';
import type { PersonSnapshot } from './owner-policy';
import type { StoredPhone } from './payloads';
import type { DispatchContact, DispatchSettings, DuplicatePersonPolicy, LookupPurpose, MissingPersonPolicy } from './types';
import type { ContactResolution } from './call-failures';
import type { DispatchTuning } from './tuning';
import { matchesPhone } from '../../../utils';
import { classifyCallFailures, failContact, payloadOf, spendAttempt } from './call-failures';
import { OPEN_ATTENDANCE_STATUSES } from './constants';
import { requirePhone } from './requirements';
import { decideOwnerChange } from './owner-policy';
import { toAttendanceStatus, toPayloadPage, toPersonSnapshot } from './payloads';
import { findOpenAttendances, findPersonsByPhone } from './routes';

/** Outcome of the person stage: decided, or the one person whose attendances must be checked. */
export type PersonLookupResolution = ContactResolution | { kind: 'checkAttendance'; person: PersonSnapshot };

/** Outcome of the attendance stage. */
export type AttendanceLookupResolution = ContactResolution;

/** One person search per distinct shape of the contact's phone. */
export function personLookupCalls(contact: DispatchContact, tuning: DispatchTuning): HttpCall[] {
    return phoneShapes(contact).map((shape) => findPersonsByPhone(shape, tuning.personLookupPageLimit));
}

/** One attendance search per stored phone of the person that matches the contact's phone. */
export function attendanceLookupCalls(person: PersonSnapshot, contact: DispatchContact, connectionId: string, tuning: DispatchTuning): HttpCall[] {
    const matching = matchingStoredPhones(person, requirePhone(contact));

    return [...new Set(matching.map((storedPhone) => storedPhone.digits))].map((digits) => findOpenAttendances(connectionId, digits, tuning.attendanceLookupPageLimit));
}

/** The settings the person stage reads: the sector, and what to do with a missing or a duplicated person. */
export type LookupSettings = Pick<DispatchSettings, 'sectorId' | 'missingPersonPolicy' | 'duplicatePersonPolicy'>;

/**
 * The two person policies of a job. A job planned before they existed carries neither, and keeps
 * the behaviour it was planned with: the missing person is created, the duplicated phone is left out.
 */
function personPoliciesOf(settings: LookupSettings): { missing: MissingPersonPolicy; duplicate: DuplicatePersonPolicy } {
    return { missing: settings.missingPersonPolicy ?? 'create', duplicate: settings.duplicatePersonPolicy ?? 'skip' };
}

/**
 * The ONE person a duplicated phone is dispatched to: among the usable ones (not blocked, with a
 * matching phone not declared off WhatsApp) — or all of them when none is —, the ones in the
 * dispatch's sector, and of those the most recently updated. With none in the sector, the most
 * recently updated of all: the phone is the same, so the message reaches the same WhatsApp either way;
 * what the choice decides is whose owner, fields and attendance count.
 */
export function chosenPerson(persons: readonly PersonSnapshot[], phone: PhoneVariants, sectorId: string): PersonSnapshot {
    const usable = persons.filter((person) => !person.isBlocked
        && !matchingStoredPhones(person, phone).every((storedPhone) => storedPhone.isWhatsapp === false));
    const pool = usable.length > 0 ? usable : persons;
    const inSector = pool.filter((person) => person.sectorIds.includes(sectorId));
    const candidates = inSector.length > 0 ? inSector : pool;

    return candidates.reduce((best, person) => (person.updatedAt > best.updatedAt ? person : best));
}

/**
 * Resolves the person stage. Two or more persons holding the phone follow
 * `duplicatePersonPolicy`: `skip` makes the contact `duplicatePersons`, `preferSector` goes on
 * with {@link chosenPerson}. A blocked person is `blocked`, one whose matching phones are all
 * declared as not being on WhatsApp is `noWhatsapp` (the campaign resolves its audience
 * with the WhatsApp filter, so such a person would never match the count), a usable one needs
 * the attendance stage. No person follows `missingPersonPolicy`: `skip` makes the contact
 * `noPerson`, `create` makes it `ready` for creation — or `missingName` when the row brought
 * no name to create the person with. A phone that leaves `is_whatsapp` undeclared is not a
 * declared no, so it goes on and the campaign's own filter decides.
 */
export function resolvePersonLookup(
    contact: DispatchContact, results: readonly CallResult[], settings: LookupSettings, purpose: LookupPurpose, now: number, tuning: DispatchTuning,
): PersonLookupResolution {
    const failure = resolveLookupFailure(contact, results, now, tuning);

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

    const policies = personPoliciesOf(settings);

    if (persons.size > 1 && policies.duplicate === 'skip') {
        return { kind: 'decided', contact: { ...settledLookup(contact, purpose, now), outcome: 'duplicatePersons' } };
    }

    const person = persons.size > 1 ? chosenPerson([...persons.values()], phone, settings.sectorId) : [...persons.values()][0];

    if (!person) {
        const outcome = policies.missing === 'skip' ? 'noPerson' : contact.name === '' ? 'missingName' : 'ready';

        return { kind: 'decided', contact: { ...settledLookup(contact, purpose, now), outcome, person: undefined, ownerChange: undefined } };
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
export function resolveAttendanceLookup(contact: DispatchContact, person: PersonSnapshot, results: readonly CallResult[], settings: DispatchSettings, purpose: LookupPurpose, now: number, tuning: DispatchTuning): AttendanceLookupResolution {
    const failure = resolveLookupFailure(contact, results, now, tuning);

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
            ownerChange: decideOwnerChange(person, contact.target, settings),
        },
    };
}

/** Failure handling of a lookup stage; `undefined` when every call succeeded. */
function resolveLookupFailure(contact: DispatchContact, results: readonly CallResult[], now: number, tuning: DispatchTuning): ContactResolution | undefined {
    const failure = classifyCallFailures(results, tuning);

    switch (failure?.kind) {
        case undefined:
            return undefined;
        case 'stopBlock':
        case 'tokenRejected':
            return failure;
        case 'outcomeUnknown':
            return spendAttempt(contact, failure.failure, 'lookupFailed', now, tuning);
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
