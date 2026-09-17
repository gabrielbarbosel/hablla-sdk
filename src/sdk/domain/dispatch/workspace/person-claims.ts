/**
 * One person is reached by one contact only: the claim map says which contact holds each
 * person, in memory during a `continue` and in the store between executions.
 */

import type { ContactOutcome } from './types';

/** Outcomes in which a contact holds the person it resolved to. */
export const CLAIMING_OUTCOMES: readonly ContactOutcome[] = ['ready', 'inAudience'];

/** True when a contact with this outcome holds the claim of its person. */
export function holdsPersonClaim(outcome: ContactOutcome): boolean {
    return CLAIMING_OUTCOMES.includes(outcome);
}

/** Result of claiming a person for a contact. */
export type PersonClaim =
    | { kind: 'claimed'; claims: ReadonlyMap<string, number> }
    | { kind: 'claimedByOther'; index: number };

/**
 * Claims a person for a contact. The first contact to resolve it keeps it, whatever its
 * index: which contact of two rows pointing at the same person gets it cannot be known
 * before both lookups answer, and a later contact never takes a person away from a
 * contact that already holds it. Any other contact resolving to it is `claimedByOther`
 * (`repeatedPerson`). Re-claiming by the same contact succeeds. Returns a new map; the
 * input is never mutated.
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
