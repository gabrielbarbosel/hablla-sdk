import { describe, it, expect } from 'vitest';
import { toDigits, firstName, hashString } from './string';

describe('toDigits', () => {
    it('keeps only digits', () => {
        expect(toDigits('+55 (51) 99959-6516')).toBe('5551999596516');
    });

    it('is safe for nullish input', () => {
        expect(toDigits(null)).toBe('');
        expect(toDigits(undefined)).toBe('');
    });
});

describe('firstName', () => {
    it('takes the first whitespace-separated token', () => {
        expect(firstName('Ana Paula Silva')).toBe('Ana');
    });

    it('collapses leading/inner whitespace', () => {
        expect(firstName('  João   Pedro ')).toBe('João');
    });

    it('returns the whole value when there is no separator', () => {
        expect(firstName('Madonna')).toBe('Madonna');
    });

    it('is safe for nullish/empty input', () => {
        expect(firstName(null)).toBe('');
        expect(firstName('   ')).toBe('');
    });
});

describe('hashString', () => {
    it('is deterministic for the same input', () => {
        expect(hashString('5551999596516')).toBe(hashString('5551999596516'));
    });

    it('returns a non-negative 32-bit integer', () => {
        const hash = hashString('anything');
        expect(hash).toBeGreaterThanOrEqual(0);
        expect(hash).toBeLessThanOrEqual(0xffffffff);
        expect(Number.isInteger(hash)).toBe(true);
    });

    it('separates different inputs', () => {
        expect(hashString('a')).not.toBe(hashString('b'));
    });
});
