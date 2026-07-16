import { describe, it, expect } from 'vitest';
import { distributeOwners } from './distribute';

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
        // spreads over more than one bucket (not degenerate)
        expect(new Set(first).size).toBeGreaterThan(1);
    });

    it('aleatorio: honors an injected rng (isolate-safe seam, no Math.random)', () => {
        // rng that always returns the same bucket → everyone lands there
        expect(distributeOwners(3, USERS, 'aleatorio', () => 1)).toEqual(['u-b', 'u-b', 'u-b']);
    });

    it('returns [] when there are no users or no slots', () => {
        expect(distributeOwners(3, [], 'rodizio')).toEqual([]);
        expect(distributeOwners(0, USERS, 'fixo')).toEqual([]);
    });
});
