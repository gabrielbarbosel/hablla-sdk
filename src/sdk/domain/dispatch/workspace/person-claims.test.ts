import { describe, it, expect } from 'vitest';
import { claimPerson, holdsPersonClaim } from './person-claims';
import type { ContactOutcome } from './types';

describe('claimPerson', () => {
    it('lets the first contact claim an unclaimed person', () => {
        const claim = claimPerson(new Map(), 'p1', 4);

        expect(claim.kind === 'claimed' && [...claim.claims]).toEqual([['p1', 4]]);
    });

    it('lets the same contact claim again', () => {
        expect(claimPerson(new Map([['p1', 4]]), 'p1', 4).kind).toBe('claimed');
    });

    it('refuses another contact, naming the holder', () => {
        expect(claimPerson(new Map([['p1', 4]]), 'p1', 9)).toEqual({ kind: 'claimedByOther', index: 4 });
    });

    it('keeps the first claim even against a lower index arriving later', () => {
        expect(claimPerson(new Map([['p1', 4]]), 'p1', 1)).toEqual({ kind: 'claimedByOther', index: 4 });
    });

    it('never mutates the given map', () => {
        const claims = new Map([['p1', 4]]);

        claimPerson(claims, 'p2', 5);

        expect([...claims]).toEqual([['p1', 4]]);
    });
});

describe('holdsPersonClaim', () => {
    it('is true only for the outcomes that keep a person', () => {
        const claiming: ContactOutcome[] = ['ready', 'inAudience'];
        const others: ContactOutcome[] = ['pendingLookup', 'repeatedPerson', 'inAttendance', 'writeFailed', 'noWhatsapp'];

        expect(claiming.every(holdsPersonClaim)).toBe(true);
        expect(others.some(holdsPersonClaim)).toBe(false);
    });
});
