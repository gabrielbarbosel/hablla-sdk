import { describe, it, expect } from 'vitest';
import {
    makeSyncRecord,
    coerceSyncRecord,
    isStale,
    hasDrift,
    nextCursor,
    contentHash,
    lastSyncedAt,
} from './sync';

const HOUR = 3600 * 1000;

describe('sync', () => {
    it('fills defaults and requires only the table name', () => {
        const s = makeSyncRecord({ table: 'sectors' });
        expect(s.strategy).toBe('full');
        expect(s.ttlSeconds).toBe(3600);
        expect(s.rowCount).toBe(0);
        expect(s.sourceCount).toBeNull();
        expect(s.status).toBe('ok');
    });

    it('is stale when never synced', () => {
        expect(isStale(makeSyncRecord({ table: 't' }), 1_000)).toBe(true);
    });

    it('is fresh within TTL and stale past it', () => {
        const now = 100 * HOUR;
        const fresh = makeSyncRecord({ table: 't', lastFullSyncAt: now - HOUR / 2, ttlSeconds: 3600 });
        const old = makeSyncRecord({ table: 't', lastFullSyncAt: now - 2 * HOUR, ttlSeconds: 3600 });
        expect(isStale(fresh, now)).toBe(false);
        expect(isStale(old, now)).toBe(true);
    });

    it('an error status is always stale', () => {
        const now = 100 * HOUR;
        const s = makeSyncRecord({ table: 't', lastFullSyncAt: now, status: 'error' });
        expect(isStale(s, now)).toBe(true);
    });

    it('prefers the delta timestamp for freshness', () => {
        const s = makeSyncRecord({ table: 't', lastFullSyncAt: 1000, lastDeltaSyncAt: 5000 });
        expect(lastSyncedAt(s)).toBe(5000);
    });

    it('detects drift when counts disagree', () => {
        expect(hasDrift(makeSyncRecord({ table: 't', rowCount: 10, sourceCount: 12 }))).toBe(true);
        expect(hasDrift(makeSyncRecord({ table: 't', rowCount: 10, sourceCount: 10 }))).toBe(false);
        expect(hasDrift(makeSyncRecord({ table: 't', rowCount: 10, sourceCount: null }))).toBe(false);
    });

    it('advances the cursor to the max updatedAt, never below prev', () => {
        const recs = [{ updatedAt: '2026-01-01' }, { updatedAt: '2026-03-01' }, { updatedAt: '2026-02-01' }];
        expect(nextCursor(recs, 'updatedAt', null)).toBe('2026-03-01');
        expect(nextCursor(recs, 'updatedAt', '2026-05-01')).toBe('2026-05-01');
        expect(nextCursor([], 'updatedAt', '2026-04-01')).toBe('2026-04-01');
        expect(nextCursor(recs, undefined, 'x')).toBe('x');
    });

    it('hashes deterministically and reacts to any change', () => {
        const a = contentHash([['h'], ['a', 1], ['b', 2]]);
        const b = contentHash([['h'], ['a', 1], ['b', 2]]);
        const c = contentHash([['h'], ['a', 1], ['b', 3]]);
        expect(a).toBe(b);
        expect(a).not.toBe(c);
    });

    it('coerces string cells back to typed numbers (sheet round-trip)', () => {
        const raw = {
            table: 't', strategy: 'incremental', lastFullSyncAt: '1000', lastDeltaSyncAt: '',
            rowCount: '25', sourceCount: '25', ttlSeconds: '600', status: 'ok',
        };
        const s = coerceSyncRecord(raw);
        expect(s.lastFullSyncAt).toBe(1000);
        expect(s.lastDeltaSyncAt).toBeNull();
        expect(s.rowCount).toBe(25);
        expect(s.ttlSeconds).toBe(600);
        expect(isStale(s, 1000 + 599 * 1000)).toBe(false);
        expect(isStale(s, 1000 + 601 * 1000)).toBe(true);
    });
});
