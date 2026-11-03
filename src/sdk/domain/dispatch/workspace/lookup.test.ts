import { describe, it, expect } from 'vitest';
import { attendanceLookupCalls, chosenPerson, personLookupCalls, resolveAttendanceLookup, resolvePersonLookup } from './lookup';
import { toPersonSnapshot } from './payloads';
import { DEFAULT_DISPATCH_TUNING } from './tuning';
import { ADVISOR, CONNECTION_ID, SYSTEM_USER, aContact, aRequest, attendanceItem, completed, page, personItem, settingsOf } from './__fixtures__/builders';
import type { CallResult } from '../../../core/call-executor';

const NOW = 1_800_000_000_000;
const SETTINGS = settingsOf(aRequest());
const CONTACT = aContact();

/** Resolves the person stage with two successful pages. */
function personStage(first: unknown[], second: unknown[] = [], contact = CONTACT) {
    return resolvePersonLookup(contact, [completed(200, page(first)), completed(200, page(second))], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING);
}

describe('personLookupCalls', () => {
    it('searches both phone shapes on the workspace token', () => {
        expect(personLookupCalls(CONTACT, DEFAULT_DISPATCH_TUNING)).toEqual([
            { method: 'GET', rawPath: '/v2/workspaces/{workspace_id}/persons', query: { phone: '5551999000001', limit: 50 }, strategy: 'workspace' },
            { method: 'GET', rawPath: '/v2/workspaces/{workspace_id}/persons', query: { phone: '555199000001', limit: 50 }, strategy: 'workspace' },
        ]);
    });
});

describe('resolvePersonLookup', () => {
    it('makes a contact without persons ready for creation, with no attendance stage', () => {
        expect(personStage([])).toEqual({
            kind: 'decided',
            contact: { ...CONTACT, outcome: 'ready', person: undefined, ownerChange: undefined, resolvedAt: NOW, lookupPurpose: 'preview', attempts: 0, retryNotBefore: undefined, failure: undefined },
        });
    });

    it('reports missingName when nobody holds the phone and the row brought no name', () => {
        expect(personStage([], [], aContact({ name: '' }))).toMatchObject({ kind: 'decided', contact: { outcome: 'missingName', person: undefined } });
    });

    it('goes on to the existing person when the row brought no name', () => {
        const item = personItem({ id: 'p1', phone: '555199000001', users: [SYSTEM_USER.id] });

        expect(personStage([item], [], aContact({ name: '' }))).toEqual({ kind: 'checkAttendance', person: toPersonSnapshot(item) });
    });

    it('asks for the attendance stage when one person holds the phone', () => {
        const item = personItem({ id: 'p1', phone: '555199000001', users: [SYSTEM_USER.id] });

        expect(personStage([item], [item])).toEqual({ kind: 'checkAttendance', person: toPersonSnapshot(item) });
    });

    it('ignores search hits whose stored phones do not match', () => {
        expect(personStage([personItem({ id: 'p1', phone: '5551888000001' })]).kind).toBe('decided');
    });

    it('reports duplicatePersons when two persons hold the phone', () => {
        const resolution = personStage([personItem({ id: 'p1', phone: '5551999000001' })], [personItem({ id: 'p2', phone: '555199000001' })]);

        expect(resolution.kind === 'decided' && resolution.contact.outcome).toBe('duplicatePersons');
    });

    it('reports a blocked person', () => {
        const resolution = personStage([personItem({ id: 'p1', phone: '5551999000001', isBlocked: true })]);

        expect(resolution.kind === 'decided' && resolution.contact.outcome).toBe('blocked');
    });

    it('reports a 401 as a rejected workspace token', () => {
        expect(resolvePersonLookup(CONTACT, [completed(401), completed(200, page([]))], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'tokenRejected' });
    });

    it.each([
        ['throttled', { kind: 'throttled' }, 'throttled'],
        ['unsent', { kind: 'unsent' }, 'throttled'],
        ['interrupted', { kind: 'interrupted', message: 'down' }, 'interrupted'],
    ] as Array<[string, CallResult, string]>)('stops the block on %s without spending an attempt', (_label, result, cause) => {
        expect(resolvePersonLookup(CONTACT, [completed(200, page([])), result], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'stopBlock', cause });
    });

    it('retries a 5xx later and fails on the third attempt', () => {
        const first = resolvePersonLookup(CONTACT, [completed(502, { message: 'bad gateway' }), completed(200, page([]))], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING);

        expect(first).toEqual({
            kind: 'retryLater',
            contact: { ...CONTACT, attempts: 1, retryNotBefore: NOW + DEFAULT_DISPATCH_TUNING.callRetryDelayMs, failure: { status: 502, detail: '{"message":"bad gateway"}' } },
        });

        const third = resolvePersonLookup({ ...CONTACT, attempts: 2 }, [{ kind: 'transportFailed', message: 'reset' }], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING);

        expect(third).toEqual({
            kind: 'decided',
            contact: { ...CONTACT, attempts: 3, outcome: 'lookupFailed', retryNotBefore: undefined, failure: { status: 'transport', detail: 'reset' } },
        });
    });

    it('fails at once on another 4xx', () => {
        const resolution = resolvePersonLookup(CONTACT, [completed(400, { message: 'bad' })], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING);

        expect(resolution.kind === 'decided' && resolution.contact).toMatchObject({ outcome: 'lookupFailed', attempts: 0, failure: { status: 400 } });
    });
});

describe('resolvePersonLookup without WhatsApp', () => {
    it('reports noWhatsapp when no matching stored phone is on WhatsApp', () => {
        const person = { ...personItem({ id: 'p1', phone: '5551999000001' }), phones: [{ phone: '5551999000001', is_whatsapp: false, type: 'personal' }] };
        const resolution = resolvePersonLookup(CONTACT, [completed(200, page([person]))], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING);

        expect(resolution.kind === 'decided' && resolution.contact).toMatchObject({ outcome: 'noWhatsapp', resolvedAt: NOW, lookupPurpose: 'preview' });
    });

    it('goes on when the matching phone does not declare WhatsApp, which is not a declared no', () => {
        const person = { ...personItem({ id: 'p1', phone: '5551999000001' }), phones: [{ phone: '5551999000001', type: 'personal' }] };

        expect(resolvePersonLookup(CONTACT, [completed(200, page([person]))], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING).kind).toBe('checkAttendance');
    });

    it('uses a matching WhatsApp phone even when another stored phone is not on WhatsApp', () => {
        const person = {
            ...personItem({ id: 'p1', phone: '5551999000001' }),
            phones: [{ phone: '5551999000001', is_whatsapp: false, type: 'personal' }, { phone: '555199000001', is_whatsapp: true, type: 'personal' }],
        };

        expect(resolvePersonLookup(CONTACT, [completed(200, page([person]))], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING).kind).toBe('checkAttendance');
    });
});

describe('attendanceLookupCalls', () => {
    it('uses the composite key with each stored phone that matches the contact', () => {
        const person = toPersonSnapshot({
            ...personItem({ id: 'p1', phone: '555199000001' }),
            phones: [{ phone: '555199000001', is_whatsapp: true }, { phone: '5551777000000', is_whatsapp: true }],
        });

        expect(attendanceLookupCalls(person, CONTACT, CONNECTION_ID, DEFAULT_DISPATCH_TUNING)).toEqual([{
            method: 'GET',
            rawPath: '/v2/workspaces/{workspace_id}/services',
            query: { key: `${CONNECTION_ID}_555199000001`, statuses: 'pending,in_queue,in_attendance,in_bot', limit: 50 },
            strategy: 'workspace',
        }]);
    });
});

describe('resolveAttendanceLookup', () => {
    const person = toPersonSnapshot(personItem({ id: 'p1', phone: '5551999000001', users: [SYSTEM_USER.id] }));

    it('does not count a closed attendance even when the status filter was ignored', () => {
        const resolution = resolveAttendanceLookup(CONTACT, person, [completed(200, page([attendanceItem('s1', 'finished')]))], SETTINGS, 'send', NOW, DEFAULT_DISPATCH_TUNING);

        expect(resolution).toEqual({
            kind: 'decided',
            contact: {
                ...CONTACT,
                outcome: 'ready',
                person: { id: 'p1', existed: true },
                ownerChange: { kind: 'replaceSystemOwners', unfollowFirst: false, removedOwnerIds: [SYSTEM_USER.id] },
                resolvedAt: NOW,
                lookupPurpose: 'send',
                attempts: 0,
                retryNotBefore: undefined,
                failure: undefined,
            },
        });
    });

    it('reports inAttendance for an open item', () => {
        const resolution = resolveAttendanceLookup(CONTACT, person, [completed(200, page([attendanceItem('s1', 'finished'), attendanceItem('s2', 'in_bot')]))], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING);

        expect(resolution.kind === 'decided' && resolution.contact.outcome).toBe('inAttendance');
    });

    it('keeps a person the advisor already owns', () => {
        const owned = toPersonSnapshot(personItem({ id: 'p1', phone: '5551999000001', users: [ADVISOR.id] }));
        const resolution = resolveAttendanceLookup(CONTACT, owned, [completed(200, page([]))], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING);

        expect(resolution.kind === 'decided' && resolution.contact.ownerChange).toEqual({ kind: 'keep' });
    });

    it('shares the failure handling of the person stage', () => {
        expect(resolveAttendanceLookup(CONTACT, person, [completed(403)], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING)).toEqual({ kind: 'tokenRejected' });
    });
});

describe('a phone two persons hold', () => {
    const SECTOR = SETTINGS.sectorId;
    const inSector = personItem({ id: 'in', phone: '5551999000001', sectors: [SECTOR], updatedAt: '2026-01-01T00:00:00Z' });
    const newer = personItem({ id: 'newer', phone: '5551999000001', sectors: ['other'], updatedAt: '2026-06-01T00:00:00Z' });
    const preferring = { ...SETTINGS, duplicatePersonPolicy: 'preferSector' as const };

    it('is left out as duplicatePersons under the skip policy', () => {
        const resolution = resolvePersonLookup(CONTACT, [completed(200, page([inSector, newer]))], SETTINGS, 'preview', NOW, DEFAULT_DISPATCH_TUNING);
        expect(resolution).toMatchObject({ kind: 'decided', contact: { outcome: 'duplicatePersons' } });
    });

    it('goes on with the person in the dispatch sector under preferSector, even when another is newer', () => {
        const resolution = resolvePersonLookup(CONTACT, [completed(200, page([newer, inSector]))], preferring, 'preview', NOW, DEFAULT_DISPATCH_TUNING);
        expect(resolution).toMatchObject({ kind: 'checkAttendance', person: { id: 'in' } });
    });

    it('takes the most recently updated when none — or several — are in the sector, and skips the blocked', () => {
        const older = personItem({ id: 'older', phone: '5551999000001', sectors: ['other'], updatedAt: '2025-01-01T00:00:00Z' });
        const blocked = personItem({ id: 'blocked', phone: '5551999000001', sectors: [SECTOR], updatedAt: '2027-01-01T00:00:00Z', isBlocked: true });
        const phone = { digits: '5551999000001', alternate: '555199000001' };

        expect(chosenPerson([older, newer].map(toPersonSnapshot), phone, SECTOR).id).toBe('newer');
        expect(chosenPerson([blocked, inSector].map(toPersonSnapshot), phone, SECTOR).id).toBe('in');
    });
});

describe('a phone no person holds', () => {
    it('is left out as noPerson under the skip policy, and created under create', () => {
        const skipping = { ...SETTINGS, missingPersonPolicy: 'skip' as const };
        expect(resolvePersonLookup(CONTACT, [completed(200, page([]))], skipping, 'preview', NOW, DEFAULT_DISPATCH_TUNING))
            .toMatchObject({ kind: 'decided', contact: { outcome: 'noPerson' } });
        expect(personStage([])).toMatchObject({ kind: 'decided', contact: { outcome: 'ready' } });
    });

    it('a job planned before the policies existed keeps creating the missing and skipping the duplicated', () => {
        const legacy = { sectorId: SETTINGS.sectorId } as typeof SETTINGS;
        expect(resolvePersonLookup(CONTACT, [completed(200, page([]))], legacy, 'preview', NOW, DEFAULT_DISPATCH_TUNING))
            .toMatchObject({ contact: { outcome: 'ready' } });
    });
});
