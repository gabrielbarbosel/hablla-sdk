import { describe, it, expect } from 'vitest';
import { decideOwnerChange, type PersonSnapshot } from './owner-policy';

const TARGET = { userId: 'advisor', source: 'advisor' } as const;
const SYSTEM_USERS = ['martech', 'kras'];

/** A person with the given owners and followers. */
function person(ownerIds: string[], followerIds: string[] = []): PersonSnapshot {
    return { id: 'p1', isBlocked: false, ownerIds, followerIds, phones: ['5551999000001'] };
}

describe('decideOwnerChange', () => {
    it('keeps a person the target already owns', () => {
        expect(decideOwnerChange(person(['advisor', 'martech']), TARGET, SYSTEM_USERS, 'replace')).toEqual({ kind: 'keep' });
    });

    it('assigns an ownerless person', () => {
        expect(decideOwnerChange(person([]), TARGET, SYSTEM_USERS, 'replace')).toEqual({ kind: 'assign', unfollowFirst: false });
    });

    it('assigns an ownerless person the target follows, unfollowing first', () => {
        expect(decideOwnerChange(person([], ['advisor']), TARGET, SYSTEM_USERS, 'add')).toEqual({ kind: 'assign', unfollowFirst: true });
    });

    it('replaces system-only owners under the replace policy', () => {
        expect(decideOwnerChange(person(['martech', 'kras']), TARGET, SYSTEM_USERS, 'replace')).toEqual({
            kind: 'replaceSystemOwners',
            unfollowFirst: false,
            removedOwnerIds: ['martech', 'kras'],
        });
    });

    it('replaces system-only owners of a person the target follows, unfollowing first', () => {
        expect(decideOwnerChange(person(['martech'], ['advisor']), TARGET, SYSTEM_USERS, 'replace')).toMatchObject({ kind: 'replaceSystemOwners', unfollowFirst: true });
    });

    it('adds beside system-only owners under the add policy', () => {
        expect(decideOwnerChange(person(['martech']), TARGET, SYSTEM_USERS, 'add')).toEqual({ kind: 'addBesideSystemOwners', unfollowFirst: false });
        expect(decideOwnerChange(person(['martech'], ['advisor']), TARGET, SYSTEM_USERS, 'add')).toEqual({ kind: 'addBesideSystemOwners', unfollowFirst: true });
    });

    it('keeps a person owned by another human, even beside system owners', () => {
        expect(decideOwnerChange(person(['other-human']), TARGET, SYSTEM_USERS, 'replace')).toEqual({ kind: 'keep' });
        expect(decideOwnerChange(person(['martech', 'other-human']), TARGET, SYSTEM_USERS, 'replace')).toEqual({ kind: 'keep' });
    });

    it('replace never removes the target owner', () => {
        expect(decideOwnerChange(person(['advisor', 'martech']), TARGET, SYSTEM_USERS, 'replace')).toEqual({ kind: 'keep' });

        const systemTarget = { userId: 'martech', source: 'reserve' } as const;
        const change = decideOwnerChange(person(['kras']), systemTarget, SYSTEM_USERS, 'replace');

        expect(change).toEqual({ kind: 'replaceSystemOwners', unfollowFirst: false, removedOwnerIds: ['kras'] });
        expect(change.kind === 'replaceSystemOwners' && change.removedOwnerIds).not.toContain('martech');
    });
});
