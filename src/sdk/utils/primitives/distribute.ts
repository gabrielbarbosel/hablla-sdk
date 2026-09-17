/**
 * Global assignment primitive: spread N slots over a pool of owners. Domain-agnostic
 * (it knows nothing about Hablla or contacts, only positions and ids) and pure —
 * deterministic and isolate-safe, so it never reaches for `Math.random`.
 */

/** Owner-distribution strategies, named as the workspace UI names them (pt-BR). */
export type OwnerStrategy = 'fixo' | 'rodizio' | 'aleatorio';

/** Weight of an owner the UI weight map has no entry for (the UI reads absence as 1). */
const UNLISTED_OWNER_WEIGHT = 1;

/**
 * Expands an owner pool by integer weights, preserving order: each id repeats as many
 * times as its weight, so `rodizio`/`aleatorio` over the expanded pool give a heavier
 * owner proportionally more slots while {@link distributeOwners} stays pure.
 *
 * The weight map follows the workspace UI contract: it may be absent (the `fixo`
 * strategy omits it) or partial (an owner added without touching its weight has no
 * entry). Both cases weigh the owner as 1. A present entry must be an integer >= 1.
 *
 * @param users Owner ids in distribution order.
 * @param weights Optional weight per owner id.
 * @returns The expanded pool (a copy of `users` when no map is given).
 * @throws RangeError when a present weight is not an integer >= 1.
 */
export const expandByWeight = (
    users: readonly string[],
    weights?: Readonly<Record<string, number>>,
): string[] => {
    if (!weights) {
        return users.slice();
    }

    const pool: string[] = [];

    for (const id of users) {
        const weight = weights[id] ?? UNLISTED_OWNER_WEIGHT;

        if (!Number.isInteger(weight) || weight < 1) {
            throw new RangeError(`expandByWeight: weight of owner ${id} must be an integer >= 1, got ${weight}`);
        }

        for (let copy = 0; copy < weight; copy++) {
            pool.push(id);
        }
    }

    return pool;
};

/**
 * Deterministic per-index bit-mix (a variant of the integer finalizer used by
 * MurmurHash). Spreads consecutive indices across the whole 32-bit range so a
 * modulo of it lands on well-distributed buckets — the default `aleatorio` source.
 */
const mixIndex = (index: number): number => {
    let value = (index + 1) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
    return (value ^ (value >>> 16)) >>> 0;
};

/**
 * One owner id per slot `0..count-1` per the strategy:
 * - `fixo` — every slot → `users[0]`.
 * - `rodizio` — round-robin `users[index % users.length]`.
 * - `aleatorio` — a bucket chosen from a per-slot number; **deterministic**, never
 *   `Math.random`. Defaults to a stable index bit-mix; inject `rng` (e.g. a hash of
 *   the contact's phone) to make the assignment stable per contact instead of per
 *   position. Whatever `rng` returns is taken `% users.length`, so any non-negative
 *   integer source works.
 *
 * Returns an empty array when there are no users (the caller then imports ownerless).
 */
export const distributeOwners = (
    count: number,
    users: readonly string[],
    mode: OwnerStrategy,
    rng: (index: number) => number = mixIndex,
): string[] => {
    if (count <= 0 || !users.length) return [];
    const owners: string[] = [];
    for (let index = 0; index < count; index++) {
        if (mode === 'fixo') {
            owners.push(users[0]!);
        } else if (mode === 'rodizio') {
            owners.push(users[index % users.length]!);
        } else {
            const pick = Math.abs(Math.trunc(rng(index))) % users.length;
            owners.push(users[pick]!);
        }
    }
    return owners;
};
