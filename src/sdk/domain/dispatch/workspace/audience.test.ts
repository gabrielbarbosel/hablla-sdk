import { describe, it, expect } from 'vitest';
import { excludeContacts, prepareAudience } from './audience';
import { ADVISOR, CONNECTION_ID, RESERVE_OWNER, ROSTER, SYSTEM_USER, aRequest, aRow } from './__fixtures__/builders';

describe('prepareAudience', () => {
    it('builds a pendingLookup contact with the normalized phone, first name and advisor target', () => {
        const { contacts } = prepareAudience(aRequest({ rows: [aRow('000001', { name: '  gABRIEL   da  Silva ' })] }), ROSTER);

        expect(contacts).toEqual([{
            index: 0,
            name: 'gABRIEL da Silva',
            phone: { digits: '5551999000001', alternate: '555199000001' },
            firstName: 'Gabriel',
            advisorResolution: 'matched',
            target: { userId: ADVISOR.id, source: 'advisor' },
            customFields: {},
            outcome: 'pendingLookup',
            writesDone: 0,
            attempts: 0,
            createSends: 0,
        }]);
    });

    it('decides by precedence: invalid phone, repeated phone, missing name, unresolved advisor', () => {
        const request = aRequest({
            unresolvedAdvisorPolicy: { kind: 'skip' },
            rows: [
                aRow('1', { phone: '123', name: '', advisorKey: '' }),
                aRow('2', { name: '' }),
                aRow('2', { name: '', advisorKey: '' }),
                aRow('3', { name: ' ', advisorKey: '' }),
                aRow('4', { advisorKey: '' }),
                aRow('5'),
            ],
        });

        expect(prepareAudience(request, ROSTER).contacts.map((contact) => contact.outcome)).toEqual([
            'invalidPhone',
            'missingName',
            'repeatedPhone',
            'missingName',
            'unresolvedAdvisor',
            'pendingLookup',
        ]);
    });

    it('keeps the first row of a repeated phone, whatever its shape', () => {
        const { contacts } = prepareAudience(aRequest({ rows: [aRow('1', { phone: '+55 (51) 99900-0001' }), aRow('1', { phone: '555199000001' })] }), ROSTER);

        expect(contacts.map((contact) => contact.outcome)).toEqual(['pendingLookup', 'repeatedPhone']);
    });

    it('resolves the advisor by email regardless of case and spacing', () => {
        const { contacts } = prepareAudience(aRequest({ rows: [aRow('1', { advisorKey: '  ADVISOR.One@example.COM ' })] }), ROSTER);

        expect(contacts[0]!.target).toEqual({ userId: ADVISOR.id, source: 'advisor' });
    });

    it('resolves the advisor by user id', () => {
        const { contacts } = prepareAudience(aRequest({ advisorKeyKind: 'userId', rows: [aRow('1', { advisorKey: ADVISOR.id })] }), ROSTER);

        expect(contacts[0]).toMatchObject({ advisorResolution: 'matched', target: { userId: ADVISOR.id, source: 'advisor' } });
    });

    it('assigns the reserve owner to missing and unknown advisors under assignReserve', () => {
        const { contacts } = prepareAudience(aRequest({ rows: [aRow('1', { advisorKey: '' }), aRow('2', { advisorKey: 'nobody@example.com' })] }), ROSTER);

        expect(contacts.map((contact) => [contact.advisorResolution, contact.target, contact.outcome])).toEqual([
            ['missing', { userId: RESERVE_OWNER.id, source: 'reserve' }, 'pendingLookup'],
            ['notFound', { userId: RESERVE_OWNER.id, source: 'reserve' }, 'pendingLookup'],
        ]);
    });

    describe('an advisor that is a system user is treated as unresolved', () => {
        it('takes the reserve owner under assignReserve', () => {
            const { contacts } = prepareAudience(aRequest({ rows: [aRow('1', { advisorKey: SYSTEM_USER.email })] }), ROSTER);

            expect(contacts[0]).toMatchObject({ advisorResolution: 'systemUser', target: { userId: RESERVE_OWNER.id, source: 'reserve' }, outcome: 'pendingLookup' });
        });

        it('is skipped under skip', () => {
            const { contacts } = prepareAudience(aRequest({ unresolvedAdvisorPolicy: { kind: 'skip' }, rows: [aRow('1', { advisorKey: SYSTEM_USER.email })] }), ROSTER);

            expect(contacts[0]).toMatchObject({ advisorResolution: 'systemUser', target: undefined, outcome: 'unresolvedAdvisor' });
        });
    });

    it('excludes the explicit phones in either 9th-digit shape', () => {
        const request = aRequest({
            rows: [aRow('1'), aRow('2'), aRow('3')],
            exclusion: { phones: ['555199000001', '51 99900-0002', 'not a phone'], segmentationFilters: [] },
        });

        expect(prepareAudience(request, ROSTER).contacts.map((contact) => contact.outcome)).toEqual(['excluded', 'excluded', 'pendingLookup']);
    });

    it('fingerprints the audience independently of row order', () => {
        const rows = [aRow('1'), aRow('2'), aRow('3', { phone: 'invalid' })];
        const forward = prepareAudience(aRequest({ rows }), ROSTER).fingerprint;
        const reversed = prepareAudience(aRequest({ rows: [...rows].reverse() }), ROSTER).fingerprint;

        expect(forward).toMatch(/^[0-9a-f]{16}-2$/);
        expect(reversed).toBe(forward);
    });

    it('fingerprints a different template or connection differently', () => {
        const base = prepareAudience(aRequest(), ROSTER).fingerprint;

        expect(prepareAudience(aRequest({ templateId: CONNECTION_ID }), ROSTER).fingerprint).not.toBe(base);
        expect(prepareAudience(aRequest({ connectionId: '6a04dd9c263b426122d2f2f2' }), ROSTER).fingerprint).not.toBe(base);
    });

    it('leaves excluded contacts out of the fingerprint', () => {
        const withExclusion = aRequest({ rows: [aRow('1'), aRow('2')], exclusion: { phones: ['5551999000002'], segmentationFilters: [] } });

        expect(prepareAudience(withExclusion, ROSTER).fingerprint).toBe(prepareAudience(aRequest({ rows: [aRow('1')] }), ROSTER).fingerprint);
    });
});

describe('excludeContacts', () => {
    it('only touches contacts still in pendingLookup', () => {
        const { contacts } = prepareAudience(aRequest({ unresolvedAdvisorPolicy: { kind: 'skip' }, rows: [aRow('1', { advisorKey: '' }), aRow('2')] }), ROSTER);

        expect(excludeContacts(contacts, ['5551999000001', '5551999000002']).map((contact) => contact.outcome)).toEqual(['unresolvedAdvisor', 'excluded']);
    });
});
