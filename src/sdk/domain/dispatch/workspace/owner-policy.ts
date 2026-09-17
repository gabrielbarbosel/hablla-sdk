import type { OwnerChange, SystemOwnerPolicy, TargetOwner } from './types';

/** An existing person as the lookup read it. */
export interface PersonSnapshot {
    id: string;
    isBlocked: boolean;
    ownerIds: readonly string[];
    followerIds: readonly string[];
    /** Stored phone digits, as returned by Hablla. */
    phones: readonly string[];
}

/**
 * Decides the owner mutation for an existing person. The target is added only when the
 * person has no owner or only system owners; a person already owned by another human
 * keeps its owners. With only system owners, `replace` removes them after adding the
 * target and `add` keeps them. A follower cannot become an owner (Hablla error 294), so
 * a target that follows the person is unfollowed first.
 */
export function decideOwnerChange(person: PersonSnapshot, target: TargetOwner, systemUserIds: readonly string[], policy: SystemOwnerPolicy): OwnerChange {
    if (person.ownerIds.includes(target.userId)) {
        return { kind: 'keep' };
    }

    const unfollowFirst = person.followerIds.includes(target.userId);

    if (person.ownerIds.length === 0) {
        return { kind: 'assign', unfollowFirst };
    }

    const humanOwnerIds = person.ownerIds.filter((ownerId) => !systemUserIds.includes(ownerId));

    if (humanOwnerIds.length > 0) {
        return { kind: 'keep' };
    }

    if (policy === 'replace') {
        return {
            kind: 'replaceSystemOwners',
            unfollowFirst,
            removedOwnerIds: person.ownerIds.filter((ownerId) => ownerId !== target.userId),
        };
    }

    return { kind: 'addBesideSystemOwners', unfollowFirst };
}
