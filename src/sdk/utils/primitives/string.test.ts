import { describe, it, expect } from 'vitest';
import { toDigits } from './string';

describe('toDigits', () => {
    it('keeps only digits', () => {
        expect(toDigits('+55 (51) 99959-6516')).toBe('5551999596516');
    });

    it('is safe for nullish input', () => {
        expect(toDigits(null)).toBe('');
        expect(toDigits(undefined)).toBe('');
    });
});
