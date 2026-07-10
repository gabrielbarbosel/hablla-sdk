import { describe, it, expect } from 'vitest';
import { phoneVariants, matchesPhone } from './phone';

describe('phoneVariants (Brazilian 9th digit)', () => {
    it('drops the 9 from a 13-digit number', () => {
        const v = phoneVariants('5551999596516');
        expect(v.digits).toBe('5551999596516');
        expect(v.alternate).toBe('555199596516');
    });

    it('inserts the 9 into a 12-digit number', () => {
        const v = phoneVariants('555199596516');
        expect(v.digits).toBe('555199596516');
        expect(v.alternate).toBe('5551999596516');
    });
});

describe('matchesPhone', () => {
    it('matches either shape', () => {
        const v = phoneVariants('5551999596516');
        expect(matchesPhone('55 51 99959-6516', v)).toBe(true);
        expect(matchesPhone('555199596516', v)).toBe(true);
        expect(matchesPhone('5551000000000', v)).toBe(false);
    });
});
