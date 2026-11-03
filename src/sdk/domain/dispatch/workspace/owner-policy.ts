import type { StoredPhone } from './payloads';
import type { DispatchSettings, OwnerChange, TargetOwner } from './types';

/** An existing person as the lookup read it. */
export interface PersonSnapshot {
    id: string;
    isBlocked: boolean;
    ownerIds: readonly string[];
    followerIds: readonly string[];
    phones: readonly StoredPhone[];
    /** The sectors the person is in. */
    sectorIds: readonly string[];
    /** When the person was last updated, epoch ms; 0 when the payload does not say. */
    updatedAt: number;
}

/** The settings that decide what happens to the owners of an existing person. */
export type OwnerSettings = Pick<DispatchSettings, 'systemUserIds' | 'systemOwnerPolicy' | 'humanOwnerPolicy'>;

/**
 * Decides the owner mutation for an existing person, with the two policies composed and
 * the target owner never removed. Without a target owner (the `noOwner` policy) nothing
 * changes: the person keeps exactly the owners it has. An ownerless person is assigned. A person owned only by
 * system users follows `systemOwnerPolicy`: `replace` removes them after adding the
 * target, `add` keeps them. A person already owned by another human follows
 * `humanOwnerPolicy`: `keep` leaves the person's owners exactly as they are and `replace`
 * puts the row's advisor in place of the human owners — plus the system owners when
 * `systemOwnerPolicy` also replaces. `keep` wins over `systemOwnerPolicy`: a person owned
 * by a human and by Martech keeps both, because removing the system owners is part of
 * handing the person to the row's advisor, and under `keep` that hand-over does not
 * happen. The app has to say so on screen (spec 15.4), since the two options look
 * independent there. A follower cannot become an owner (Hablla error 294), so a target
 * that follows is unfollowed first.
 */
export function decideOwnerChange(person: PersonSnapshot, target: TargetOwner | undefined, settings: OwnerSettings): OwnerChange {
    if (!target || person.ownerIds.includes(target.userId)) {
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
