import type { StoredPhone } from './payloads';
import type { DispatchSettings, OwnerChange, TargetOwner } from './types';

/** An existing person as the lookup read it. */
export interface PersonSnapshot {
    id: string;
    isBlocked: boolean;
    ownerIds: readonly string[];
    followerIds: readonly string[];
    phones: readonly StoredPhone[];
}

/** The settings that decide what happens to the owners of an existing person. */
export type OwnerSettings = Pick<DispatchSettings, 'systemUserIds' | 'systemOwnerPolicy' | 'humanOwnerPolicy'>;

/**
 * Decides the owner mutation for an existing person, with the two policies composed and
 * the target owner never removed. An ownerless person is assigned. A person owned only by
 * system users follows `systemOwnerPolicy`: `replace` removes them after adding the
 * target, `add` keeps them. A person already owned by another human follows
 * `humanOwnerPolicy`: `keep` leaves everything as it is (the system owners included, since
 * the dispatch adds no owner at all), and `replace` puts the row's advisor in place of the
 * human owners — plus the system owners when `systemOwnerPolicy` also replaces, which is
 * the only reading that leaves no ambiguity when the person has both kinds. A follower
 * cannot become an owner (Hablla error 294), so a target that follows is unfollowed first.
 */
export function decideOwnerChange(person: PersonSnapshot, target: TargetOwner, settings: OwnerSettings): OwnerChange {
    if (person.ownerIds.includes(target.userId)) {
        return { kind: 'keep' };
    }

    const unfollowFirst = person.followerIds.includes(target.userId);

    if (person.ownerIds.length === 0) {
        return { kind: 'assign', unfollowFirst };
    }

    const humanOwnerIds = person.ownerIds.filter((ownerId) => !settings.systemUserIds.includes(ownerId));

    if (humanOwnerIds.length > 0) {
        return settings.humanOwnerPolicy === 'keep'
            ? { kind: 'keep' }
            : { kind: 'replaceHumanOwners', unfollowFirst, removedOwnerIds: settings.systemOwnerPolicy === 'replace' ? person.ownerIds : humanOwnerIds };
    }

    return settings.systemOwnerPolicy === 'replace'
        ? { kind: 'replaceSystemOwners', unfollowFirst, removedOwnerIds: person.ownerIds }
        : { kind: 'addBesideSystemOwners', unfollowFirst };
}
