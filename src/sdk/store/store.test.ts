import { describe, it, expect } from 'vitest';
import type { TableSchema } from './schema';
import { HabllaStore } from './store';
import { MemoryTableStore } from './port';

interface Sector {
    id: string;
    name: string;
    updatedAt: string;
}

const SECTORS: TableSchema<Sector> = {
    name: 'sectors',
    idField: 'id',
    updatedAtField: 'updatedAt',
    columns: ['id', 'name', 'updatedAt'],
};

const NOW = 100 * 3600 * 1000;

function makeStore() {
    return new HabllaStore(new MemoryTableStore(), [SECTORS], { sdkVersion: '0.1.7' });
}

describe('HabllaStore', () => {
    it('upserts, then reads entities back losslessly', async () => {
        const store = makeStore();
        await store.upsert('sectors', [
            { id: 's1', name: 'Vendas', updatedAt: '2026-01-01' },
            { id: 's2', name: 'Suporte', updatedAt: '2026-01-01' },
        ], { now: NOW });
        const all = await store.all<Sector>('sectors');
        expect(all).toEqual([
            { id: 's1', name: 'Vendas', updatedAt: '2026-01-01' },
            { id: 's2', name: 'Suporte', updatedAt: '2026-01-01' },
        ]);
    });

    it('writes a _sync control row with counts, cursor and version', async () => {
        const store = makeStore();
        const { sync } = await store.upsert('sectors', [
            { id: 's1', name: 'A', updatedAt: '2026-02-01' },
            { id: 's2', name: 'B', updatedAt: '2026-05-01' },
        ], { now: NOW, sourceCount: 2 });
        expect(sync.rowCount).toBe(2);
        expect(sync.sourceCount).toBe(2);
        expect(sync.cursor).toBe('2026-05-01');
        expect(sync.lastFullSyncAt).toBe(NOW);
        expect(sync.sdkVersion).toBe('0.1.7');
        expect(await store.isFresh('sectors', NOW)).toBe(true);
    });

    it('is idempotent — the same batch twice writes once', async () => {
        const store = makeStore();
        const batch = [{ id: 's1', name: 'A', updatedAt: '2026-02-01' }];
        const first = await store.upsert('sectors', batch, { now: NOW });
        const second = await store.upsert('sectors', batch, { now: NOW + 1000 });
        expect(first.changed).toBe(true);
        expect(second.changed).toBe(false);
    });

    it('folds an incremental batch in — updated row wins, new row appends', async () => {
        const store = makeStore();
        await store.upsert('sectors', [
            { id: 's1', name: 'A', updatedAt: '2026-01-01' },
            { id: 's2', name: 'B', updatedAt: '2026-01-01' },
        ], { now: NOW });
        const { entities } = await store.upsert('sectors', [
            { id: 's1', name: 'A2', updatedAt: '2026-06-01' },
            { id: 's3', name: 'C', updatedAt: '2026-06-01' },
        ], { now: NOW + 1000, strategy: 'incremental' });
        expect(entities.map((s) => `${s.id}:${s.name}`)).toEqual(['s1:A2', 's2:B', 's3:C']);
        const sync = await store.syncOf('sectors');
        expect(sync?.strategy).toBe('incremental');
        expect(sync?.lastDeltaSyncAt).toBe(NOW + 1000);
        expect(sync?.cursor).toBe('2026-06-01');
    });

    it('reports freshness by TTL', async () => {
        const store = makeStore();
        await store.upsert('sectors', [{ id: 's1', name: 'A', updatedAt: '2026-01-01' }], { now: NOW });
        expect(await store.isFresh('sectors', NOW + 1800 * 1000)).toBe(true); // within 1h TTL
        expect(await store.isFresh('sectors', NOW + 7200 * 1000)).toBe(false); // past it
    });

    it('markError flags the table without dropping its data', async () => {
        const store = makeStore();
        await store.upsert('sectors', [{ id: 's1', name: 'A', updatedAt: '2026-01-01' }], { now: NOW });
        await store.markError('sectors', 'boom');
        const sync = await store.syncOf('sectors');
        expect(sync?.status).toBe('error');
        expect(sync?.lastError).toBe('boom');
        expect(await store.isFresh('sectors', NOW)).toBe(false);
        expect(await store.all('sectors')).toHaveLength(1); // data intact
    });

    it('syncAll returns one control row per table', async () => {
        const store = makeStore();
        await store.upsert('sectors', [{ id: 's1', name: 'A', updatedAt: '2026-01-01' }], { now: NOW });
        const all = await store.syncAll();
        expect(Object.keys(all)).toEqual(['sectors']);
        expect(all.sectors.rowCount).toBe(1);
    });

    it('throws on an unregistered table', async () => {
        const store = makeStore();
        await expect(store.all('nope')).rejects.toThrow(/não registrada/);
    });
});
