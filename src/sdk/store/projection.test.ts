import { describe, it, expect } from 'vitest';
import type { TableSchema } from './schema';
import { headerFor, projectRow, projectMatrix, parseRow, parseMatrix } from './projection';

interface Sector {
    id: string;
    name: string;
    active: boolean;
    updatedAt: string;
    extra?: { nested: number };
}

const SECTORS: TableSchema<Sector> = {
    name: 'sectors',
    idField: 'id',
    updatedAtField: 'updatedAt',
    columns: ['id', 'name', 'active', 'updatedAt'],
};

describe('projection', () => {
    it('appends _raw to the header when raw is on (default)', () => {
        expect(headerFor(SECTORS)).toEqual(['id', 'name', 'active', 'updatedAt', '_raw']);
    });

    it('omits _raw when the schema opts out', () => {
        expect(headerFor({ ...SECTORS, raw: false })).toEqual(['id', 'name', 'active', 'updatedAt']);
    });

    it('projects hot cells plus the full entity as _raw', () => {
        const s: Sector = { id: 's1', name: 'Vendas', active: true, updatedAt: '2026-07-15T00:00:00.000Z' };
        const row = projectRow(SECTORS, s);
        expect(row.slice(0, 4)).toEqual(['s1', 'Vendas', true, '2026-07-15T00:00:00.000Z']);
        expect(JSON.parse(row[4] as string)).toEqual(s);
    });

    it('round-trips an entity through project → parse via _raw (lossless, keeps nested)', () => {
        const s: Sector = { id: 's1', name: 'X', active: false, updatedAt: '2026-01-01', extra: { nested: 7 } };
        const back = parseRow(SECTORS, headerFor(SECTORS), projectRow(SECTORS, s));
        expect(back).toEqual(s);
    });

    it('assembles from hot columns when _raw is off', () => {
        const schema = { ...SECTORS, raw: false };
        const s: Sector = { id: 's1', name: 'X', active: true, updatedAt: '2026-01-01' };
        const back = parseRow(schema, headerFor(schema), projectRow(schema, s));
        expect(back).toEqual({ id: 's1', name: 'X', active: true, updatedAt: '2026-01-01' });
    });

    it('coerces a Date cell to ISO and encodes objects as JSON', () => {
        const schema: TableSchema = { name: 't', idField: 'id', columns: ['id', 'when', 'meta'], raw: false };
        const row = projectRow(schema, { id: 'a', when: new Date('2026-07-15T12:00:00.000Z'), meta: { k: 1 } });
        expect(row).toEqual(['a', '2026-07-15T12:00:00.000Z', '{"k":1}']);
    });

    it('drops blank/idless rows on parse', () => {
        const matrix = projectMatrix(SECTORS, [
            { id: 's1', name: 'A', active: true, updatedAt: '2026-01-01' },
        ]);
        matrix.push(['', '', '', '', '']); // a padding row
        expect(parseMatrix(SECTORS, matrix)).toHaveLength(1);
    });

    it('parses an empty matrix to an empty list', () => {
        expect(parseMatrix(SECTORS, [])).toEqual([]);
    });
});
