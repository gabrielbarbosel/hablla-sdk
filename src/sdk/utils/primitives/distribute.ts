/**
 * Global assignment primitive: spread N slots over a pool of owners. Domain-agnostic
 * (it knows nothing about Hablla or contacts, only positions and ids) and pure —
 * deterministic and isolate-safe, so it never reaches for `Math.random`.
 */

/** Owner-distribution strategies, named as the workspace UI names them (pt-BR). */
export type OwnerStrategy = 'fixo' | 'rodizio' | 'aleatorio';

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
