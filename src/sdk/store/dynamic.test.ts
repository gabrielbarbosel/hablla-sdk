import { describe, it, expect } from 'vitest';
import { flatKeys, autoColumns, getPath, dynamicSchema } from './dynamic';
import { HabllaStore } from './store';
import { MemoryTableStore } from './port';
import { projectMatrix } from './projection';

describe('dynamic columns', () => {
    it('flattens nested objects to dot-notation, arrays stay whole keys', () => {
        expect(flatKeys({ id: 'a', user: { name: 'X', roles: ['r1'] }, tags: ['t'] }))
            .toEqual(['id', 'user.name', 'user.roles', 'tags']);
    });

    it('treats Date as a leaf, not an object to recurse', () => {
        expect(flatKeys({ when: new Date('2026-01-01') })).toEqual(['when']);
    });

    it('unions keys across records in first-seen order', () => {
        const cols = autoColumns([{ a: 1, b: 2 }, { a: 1, c: 3 }, { b: 2, d: 4 }]);
        expect(cols).toEqual(['a', 'b', 'c', 'd']);
    });

    it('getPath reads dot-paths null-safe', () => {
        expect(getPath({ user: { name: 'X' } }, 'user.name')).toBe('X');
        expect(getPath({ user: null }, 'user.name')).toBeNull();
        expect(getPath({}, 'a.b.c')).toBeNull();
    });

    it('builds a schema whose columns cover every discovered field', () => {
        const recs = [{ id: 's1', user: { name: 'A', email: 'a@x' }, updated_at: '2026-01-01' }];
        const schema = dynamicSchema('users', recs, { idField: 'id', updatedAtField: 'updated_at' });
        const cols = schema.columns.map((c) => (typeof c === 'string' ? c : c.name));
        expect(cols).toEqual(['id', 'user.name', 'user.email', 'updated_at']);
        // projection pulls the nested values via the dot-path getters
        const [, row] = projectMatrix(schema, recs);
        expect(row.slice(0, 4)).toEqual(['s1', 'A', 'a@x', '2026-01-01']);
    });

    it('upsertAuto writes ALL fields as columns and round-trips via _raw', async () => {
        const store = new HabllaStore(new MemoryTableStore());
        const recs = [
            { id: 's1', name: 'A', data: { phone: '55' }, updated_at: '2026-01-01' },
            { id: 's2', name: 'B', extra: true, updated_at: '2026-02-01' }, // campo só no 2º
        ];
        await store.upsertAuto('t', recs, { now: 1000, idField: 'id', updatedAtField: 'updated_at' });
        const all = await store.all('t');
        expect(all).toEqual(recs); // lossless via _raw
        const sync = await store.syncOf('t');
        expect(sync?.cursor).toBe('2026-02-01'); // watermark do updated_at
    });
});
