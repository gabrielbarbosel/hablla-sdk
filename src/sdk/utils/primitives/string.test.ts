import { describe, it, expect } from 'vitest';
import { toDigits, firstName, hashString, hash64Hex, collapseWhitespace, capitalizeWord } from './string';

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

describe('hash64Hex', () => {
    it('is deterministic and 16 lowercase hex digits long', () => {
        expect(hash64Hex('conn|tmpl|5551999990001')).toBe(hash64Hex('conn|tmpl|5551999990001'));
        expect(hash64Hex('conn|tmpl|5551999990001')).toMatch(/^[0-9a-f]{16}$/);
    });

    it('separates different inputs', () => {
        expect(hash64Hex('a')).not.toBe(hash64Hex('b'));
    });

    it('differs from the 32-bit hashString repeated twice', () => {
        const hex32 = hashString('anything').toString(16).padStart(8, '0');

        expect(hash64Hex('anything').startsWith(hex32)).toBe(true);
        expect(hash64Hex('anything')).not.toBe(hex32 + hex32);
    });
});

describe('collapseWhitespace', () => {
    it('trims and collapses inner whitespace runs', () => {
        expect(collapseWhitespace('  Ana \t Paula\n Souza ')).toBe('Ana Paula Souza');
    });

    it('turns a blank string into an empty one', () => {
        expect(collapseWhitespace(' \t ')).toBe('');
    });
});

describe('capitalizeWord', () => {
    it('upper-cases the first letter and lower-cases the rest', () => {
        expect(capitalizeWord('gABRIEL')).toBe('Gabriel');
    });

    it('handles pt-BR accented letters', () => {
        expect(capitalizeWord('ÁLVARO')).toBe('Álvaro');
    });

    it('keeps an empty word empty', () => {
        expect(capitalizeWord('')).toBe('');
    });
});
