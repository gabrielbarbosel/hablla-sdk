import { describe, it, expect } from 'vitest';
import type { TableSchema } from './schema';
import { upsertAll, updatedAtResolver, idOf, sortByDesc } from './merge';

interface Row {
    id: string;
    name: string;
    updatedAt?: string;
}

const SCHEMA: TableSchema<Row> = {
    name: 't',
    idField: 'id',
    updatedAtField: 'updatedAt',
    columns: ['id', 'name', 'updatedAt'],
};

describe('merge / upsertAll', () => {
    it('inserts new ids and keeps first-seen order', () => {
        const out = upsertAll(SCHEMA, [{ id: 'a', name: 'A' }], [{ id: 'b', name: 'B' }]);
        expect(out.map((r) => r.id)).toEqual(['a', 'b']);
    });

    it('newer updatedAt wins a collision', () => {
        const out = upsertAll(
            SCHEMA,
            [{ id: 'a', name: 'old', updatedAt: '2026-01-01' }],
            [{ id: 'a', name: 'new', updatedAt: '2026-02-01' }],
        );
        expect(out).toEqual([{ id: 'a', name: 'new', updatedAt: '2026-02-01' }]);
    });

    it('older updatedAt loses (never regresses)', () => {
        const out = upsertAll(
            SCHEMA,
            [{ id: 'a', name: 'new', updatedAt: '2026-02-01' }],
            [{ id: 'a', name: 'old', updatedAt: '2026-01-01' }],
        );
        expect(out[0].name).toBe('new');
    });

    it('a tie lets incoming refresh in place', () => {
        const out = upsertAll(
            SCHEMA,
            [{ id: 'a', name: 'first', updatedAt: '2026-01-01' }],
            [{ id: 'a', name: 'second', updatedAt: '2026-01-01' }],
        );
        expect(out[0].name).toBe('second');
    });

    it('missing updatedAt always loses to one that has it', () => {
        const out = upsertAll(SCHEMA, [{ id: 'a', name: 'stamped', updatedAt: '2026-01-01' }], [{ id: 'a', name: 'blank' }]);
        expect(out[0].name).toBe('stamped');
    });

    it('drops idless incoming records', () => {
        const out = upsertAll(SCHEMA, [], [{ id: '', name: 'nope' } as Row, { id: 'a', name: 'yes' }]);
        expect(out.map((r) => r.id)).toEqual(['a']);
    });

    it('honors a custom resolver', () => {
        const keepExisting = updatedAtResolver<Row>(undefined); // no field ⇒ () => true, incoming wins
        expect(keepExisting({ id: 'a', name: 'x' }, { id: 'a', name: 'y' })).toBe(true);
        const never = upsertAll(SCHEMA, [{ id: 'a', name: 'keep' }], [{ id: 'a', name: 'drop' }], () => false);
        expect(never[0].name).toBe('keep');
    });

    it('idOf stringifies the id field', () => {
        expect(idOf({ name: 't', idField: 'id', columns: ['id'] }, { id: 42 })).toBe('42');
    });

    it('sortByDesc orders by a hot column descending', () => {
        const rows = [{ id: 'a', name: 'A', updatedAt: '2026-01-01' }, { id: 'b', name: 'B', updatedAt: '2026-03-01' }];
        expect(sortByDesc(SCHEMA, 'updatedAt', rows).map((r) => r.id)).toEqual(['b', 'a']);
    });
});
