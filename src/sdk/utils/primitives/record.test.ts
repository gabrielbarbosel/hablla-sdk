import { describe, it, expect } from 'vitest';
import { collectIndexed } from './record';

describe('collectIndexed', () => {
    it('returns values ordered by numeric suffix', () => {
        const record = { var2: 'b', var10: 'c', var1: 'a', name: 'x' };
        expect(collectIndexed(record, 'var')).toEqual(['a', 'b', 'c']);
    });

    it('is empty when nothing matches', () => {
        expect(collectIndexed({ name: 'x' }, 'var')).toEqual([]);
    });
});
