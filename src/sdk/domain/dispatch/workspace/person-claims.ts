/** Result of claiming a person for a contact. */
export type PersonClaim =
    | { kind: 'claimed'; claims: ReadonlyMap<string, number> }
    | { kind: 'claimedByOther'; index: number };

/**
 * Claims a person for a contact so one person is reached by one contact only. The first
 * contact to claim keeps the person (the store seeds the map with the lowest index of
 * each person); any other contact resolving to it is `claimedByOther`. Re-claiming by
 * the same contact succeeds. Returns a new map; the input is never mutated.
 */
export function claimPerson(claims: ReadonlyMap<string, number>, personId: string, contactIndex: number): PersonClaim {
    const holder = claims.get(personId);

    if (holder !== undefined && holder !== contactIndex) {
        return { kind: 'claimedByOther', index: holder };
    }

    const updated = new Map(claims);
    updated.set(personId, contactIndex);

    return { kind: 'claimed', claims: updated };
}
