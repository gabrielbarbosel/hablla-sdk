import { describe, it, expect } from 'vitest';
import { serializeQuery } from '../src/sdk/core/query';

describe('serializeQuery (qs indices)', () => {
    it('empty', () => {
        expect(serializeQuery({})).toBe('');
        expect(serializeQuery(null)).toBe('');
    });

    it('scalars', () => {
        expect(serializeQuery({ limit: 50, page: 1 })).toBe('?limit=50&page=1');
    });

    it('arrays in indices format (encoded brackets, like the app)', () => {
        expect(serializeQuery({ users: ['a', 'b'] })).toBe('?users%5B0%5D=a&users%5B1%5D=b');
    });

    it('nested objects', () => {
        expect(serializeQuery({ filter: { status: 'open' } })).toBe('?filter%5Bstatus%5D=open');
    });

    it('skips null/undefined', () => {
        expect(serializeQuery({ a: 1, b: null, c: undefined })).toBe('?a=1');
    });

    it('encodes values', () => {
        expect(serializeQuery({ q: 'a b&c' })).toBe('?q=a%20b%26c');
    });
});
