import { describe, it, expect } from 'vitest';
import { decideOwnerChange, type OwnerSettings, type PersonSnapshot } from './owner-policy';

const TARGET = { userId: 'advisor', source: 'advisor' } as const;
const SYSTEM_USERS = ['martech', 'kras'];

/** A person with the given owners and followers. */
function person(ownerIds: string[], followerIds: string[] = []): PersonSnapshot {
    return { id: 'p1', isBlocked: false, ownerIds, followerIds, phones: [{ digits: '5551999000001', isWhatsapp: true }] };
}

/** The owner settings, with the conservative human policy unless the case says otherwise. */
function policies(systemOwnerPolicy: OwnerSettings['systemOwnerPolicy'], humanOwnerPolicy: OwnerSettings['humanOwnerPolicy'] = 'keep'): OwnerSettings {
    return { systemUserIds: SYSTEM_USERS, systemOwnerPolicy, humanOwnerPolicy };
}

describe('decideOwnerChange', () => {
    it('keeps a person the target already owns', () => {
        expect(decideOwnerChange(person(['advisor', 'martech']), TARGET, policies('replace'))).toEqual({ kind: 'keep' });
    });

    it('assigns an ownerless person', () => {
        expect(decideOwnerChange(person([]), TARGET, policies('replace'))).toEqual({ kind: 'assign', unfollowFirst: false });
    });

    it('assigns an ownerless person the target follows, unfollowing first', () => {
        expect(decideOwnerChange(person([], ['advisor']), TARGET, policies('add'))).toEqual({ kind: 'assign', unfollowFirst: true });
    });

    it('replaces system-only owners under the replace policy', () => {
        expect(decideOwnerChange(person(['martech', 'kras']), TARGET, policies('replace'))).toEqual({
            kind: 'replaceSystemOwners',
            unfollowFirst: false,
            removedOwnerIds: ['martech', 'kras'],
        });
    });

    it('replaces system-only owners of a person the target follows, unfollowing first', () => {
        expect(decideOwnerChange(person(['martech'], ['advisor']), TARGET, policies('replace'))).toMatchObject({ kind: 'replaceSystemOwners', unfollowFirst: true });
    });

    it('adds beside system-only owners under the add policy', () => {
        expect(decideOwnerChange(person(['martech']), TARGET, policies('add'))).toEqual({ kind: 'addBesideSystemOwners', unfollowFirst: false });
        expect(decideOwnerChange(person(['martech'], ['advisor']), TARGET, policies('add'))).toEqual({ kind: 'addBesideSystemOwners', unfollowFirst: true });
    });

    it('keeps a person owned by another human under the default human policy, even beside system owners', () => {
        expect(decideOwnerChange(person(['other-human']), TARGET, policies('replace'))).toEqual({ kind: 'keep' });
        expect(decideOwnerChange(person(['martech', 'other-human']), TARGET, policies('replace'))).toEqual({ kind: 'keep' });
    });

    it('replaces the human owner under the replace human policy', () => {
        expect(decideOwnerChange(person(['other-human']), TARGET, policies('add', 'replace'))).toEqual({
            kind: 'replaceHumanOwners',
            unfollowFirst: false,
            removedOwnerIds: ['other-human'],
        });
    });

    it('takes the system owners along only when the system policy also replaces', () => {
        expect(decideOwnerChange(person(['martech', 'other-human']), TARGET, policies('replace', 'replace'))).toEqual({
            kind: 'replaceHumanOwners',
            unfollowFirst: false,
            removedOwnerIds: ['martech', 'other-human'],
        });
        expect(decideOwnerChange(person(['martech', 'other-human']), TARGET, policies('add', 'replace'))).toEqual({
            kind: 'replaceHumanOwners',
            unfollowFirst: false,
            removedOwnerIds: ['other-human'],
        });
    });

    it('unfollows first when the target follows the person it takes over', () => {
        expect(decideOwnerChange(person(['other-human'], ['advisor']), TARGET, policies('add', 'replace'))).toMatchObject({ kind: 'replaceHumanOwners', unfollowFirst: true });
    });

    it('keeps a person the target already owns, whatever the human policy says', () => {
        expect(decideOwnerChange(person(['advisor', 'other-human']), TARGET, policies('replace', 'replace'))).toEqual({ kind: 'keep' });
    });

    it('replace never removes the target owner', () => {
        expect(decideOwnerChange(person(['advisor', 'martech']), TARGET, policies('replace'))).toEqual({ kind: 'keep' });

        const systemTarget = { userId: 'martech', source: 'reserve' } as const;
        const change = decideOwnerChange(person(['kras']), systemTarget, policies('replace'));

        expect(change).toEqual({ kind: 'replaceSystemOwners', unfollowFirst: false, removedOwnerIds: ['kras'] });
        expect(change.kind === 'replaceSystemOwners' && change.removedOwnerIds).not.toContain('martech');
    });
});
