import { describe, it, expect } from 'vitest';
import { HabllaCache } from './cache';

describe('HabllaCache', () => {
    it('seeds and reads the strategy map', () => {
        const cache = new HabllaCache({ strategies: { 'POST:/x': 'bearer' } });
        expect(cache.strategies()).toEqual({ 'POST:/x': 'bearer' });
        expect(cache.get('strategies', 'POST:/x')).toBe('bearer');
    });

    it('is empty by default', () => {
        expect(new HabllaCache().strategies()).toEqual({});
    });

    it('stores and reads namespaced values', () => {
        const cache = new HabllaCache();
        cache.set('ns', 'k', 42);
        expect(cache.get('ns', 'k')).toBe(42);
        expect(cache.entries('ns')).toEqual({ k: 42 });
    });

    it('merges learned strategies over the seed', () => {
        const cache = new HabllaCache({ strategies: { 'POST:/x': 'bearer' } });
        cache.mergeStrategies({ 'GET:/y': 'workspace' });
        expect(cache.strategies()).toEqual({ 'POST:/x': 'bearer', 'GET:/y': 'workspace' });
    });

    it('returns copies so callers cannot mutate the store', () => {
        const cache = new HabllaCache({ strategies: { 'POST:/x': 'bearer' } });
        cache.strategies()['POST:/x'] = 'workspace';
        expect(cache.strategies()).toEqual({ 'POST:/x': 'bearer' });
    });
});
