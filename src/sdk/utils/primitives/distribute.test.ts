import { describe, it, expect } from 'vitest';
import { distributeOwners, expandByWeight } from './distribute';

const USERS = ['u-a', 'u-b', 'u-c'];

describe('distributeOwners', () => {
    it('fixo: every slot goes to the first user', () => {
        expect(distributeOwners(4, USERS, 'fixo')).toEqual(['u-a', 'u-a', 'u-a', 'u-a']);
    });

    it('rodizio: round-robins across the pool', () => {
        expect(distributeOwners(5, USERS, 'rodizio')).toEqual(['u-a', 'u-b', 'u-c', 'u-a', 'u-b']);
    });

    it('aleatorio (default): deterministic across calls and only picks real users', () => {
        const first = distributeOwners(20, USERS, 'aleatorio');
        const second = distributeOwners(20, USERS, 'aleatorio');
        expect(first).toEqual(second);
        expect(first.every((owner) => USERS.includes(owner))).toBe(true);
    });

    it('aleatorio (default): spreads over more than one bucket', () => {
        expect(new Set(distributeOwners(20, USERS, 'aleatorio')).size).toBeGreaterThan(1);
    });

    it('aleatorio: an injected rng that always picks one bucket sends every slot there', () => {
        expect(distributeOwners(3, USERS, 'aleatorio', () => 1)).toEqual(['u-b', 'u-b', 'u-b']);
    });

    it('returns [] when there are no users or no slots', () => {
        expect(distributeOwners(3, [], 'rodizio')).toEqual([]);
        expect(distributeOwners(0, USERS, 'fixo')).toEqual([]);
    });
});

describe('expandByWeight', () => {
    it('returns a copy of the pool when no weight map is given', () => {
        const pool = expandByWeight(USERS);

        expect(pool).toEqual(USERS);
        expect(pool).not.toBe(USERS);
    });

    it('repeats each id by its weight, preserving order', () => {
        expect(expandByWeight(USERS, { 'u-a': 2, 'u-b': 1, 'u-c': 3 })).toEqual(['u-a', 'u-a', 'u-b', 'u-c', 'u-c', 'u-c']);
    });

    it('weighs an owner missing from a partial map as 1', () => {
        expect(expandByWeight(USERS, { 'u-a': 2 })).toEqual(['u-a', 'u-a', 'u-b', 'u-c']);
    });

    it('weighs every owner as 1 under an empty map', () => {
        expect(expandByWeight(USERS, {})).toEqual(USERS);
    });

    it('throws naming the owner when a present weight is zero, negative or fractional', () => {
        expect(() => expandByWeight(USERS, { 'u-b': 0 })).toThrow(/u-b/);
        expect(() => expandByWeight(USERS, { 'u-a': -5 })).toThrow(RangeError);
        expect(() => expandByWeight(USERS, { 'u-c': 1.5 })).toThrow(/u-c/);
    });

    it('returns an empty pool for an empty user list', () => {
        expect(expandByWeight([], { 'u-a': 2 })).toEqual([]);
    });

    it('gives the heavier owner proportionally more rodizio slots', () => {
        const owners = distributeOwners(6, expandByWeight(['u-a', 'u-b'], { 'u-a': 2, 'u-b': 1 }), 'rodizio');

        expect(owners.filter((owner) => owner === 'u-a')).toHaveLength(4);
        expect(owners.filter((owner) => owner === 'u-b')).toHaveLength(2);
    });
});
