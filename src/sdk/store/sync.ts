/**
 * The `_sync` control table — one row per table saying when it was last refreshed and whether
 * it can be trusted. Read-through consults it (fresh? serve the tab; stale? hit the API); the
 * incremental sync advances its `cursor` watermark; drift detection compares `rowCount` vs the
 * source's `sourceCount`. Modeled as just another {@link TableSchema}, so the same store reads
 * and writes it through the same port. Dependency-free hashing (no `node:crypto`) so it runs in
 * the RPO isolate too. `now` is always passed in — the core never reads the clock itself.
 */
import type { TableSchema } from './schema';

/** Cache strategy for a table (mirrors the design's sync table). */
export type SyncStrategy = 'full' | 'incremental' | 'write-through';

/** Health of a table's cache. */
export type SyncStatus = 'ok' | 'syncing' | 'stale' | 'error';

/** One control row: the freshness + provenance of a single table. */
export interface SyncRecord {
    /** Table this row describes (the id of the `_sync` table). */
    table: string;
    strategy: SyncStrategy;
    /** Epoch ms of the last full mirror, or null. */
    lastFullSyncAt: number | null;
    /** Epoch ms of the last incremental delta, or null. */
    lastDeltaSyncAt: number | null;
    /** Watermark of the max `updatedAt` pulled so far (incremental resumes past it). */
    cursor: string | null;
    /** Rows currently in the tab. */
    rowCount: number;
    /** Rows the source reports having (detects drift when it disagrees with rowCount). */
    sourceCount: number | null;
    /** Cheap hash of the projected rows — skip a rewrite when nothing changed. */
    contentHash: string;
    /** Freshness budget in seconds; `age > ttl` ⇒ stale. */
    ttlSeconds: number;
    status: SyncStatus;
    lastError: string | null;
    sdkVersion: string | null;
    /** Cold-store pointers (filled once a table is archived; see Fase 5). */
    blobId: string | null;
    blobHash: string | null;
    sig: string | null;
    keyId: string | null;
    lastArchiveAt: number | null;
}

const DEFAULT_TTL_SECONDS = 3600;

/** Fills a partial control row with defaults (unknowns as null, never invented). */
export function makeSyncRecord(partial: Partial<SyncRecord> & { table: string }): SyncRecord {
    return {
        strategy: 'full',
        lastFullSyncAt: null,
        lastDeltaSyncAt: null,
        cursor: null,
        rowCount: 0,
        sourceCount: null,
        contentHash: '',
        ttlSeconds: DEFAULT_TTL_SECONDS,
        status: 'ok',
        lastError: null,
        sdkVersion: null,
        blobId: null,
        blobHash: null,
        sig: null,
        keyId: null,
        lastArchiveAt: null,
        ...partial,
    };
}

/** Numeric fields of a control row — coerced back from strings when a store round-trips them as text. */
const NUMERIC_FIELDS: Array<keyof SyncRecord> = [
    'lastFullSyncAt', 'lastDeltaSyncAt', 'rowCount', 'sourceCount', 'ttlSeconds', 'lastArchiveAt',
];

/** A `null`/`''`-preserving number parse (blank cells stay null, never 0). */
function toNumberOrNull(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
}

/**
 * Coerces a parsed control row back to a typed {@link SyncRecord}. A sheet store returns every
 * cell as a string; this restores the numeric fields (so `isStale`/drift math is correct) and
 * fills any missing field with its default.
 */
export function coerceSyncRecord(raw: Record<string, unknown>): SyncRecord {
    const out: Record<string, unknown> = { ...raw };
    for (const field of NUMERIC_FIELDS) out[field] = toNumberOrNull(raw[field]);
    return makeSyncRecord(out as Partial<SyncRecord> & { table: string });
}

/** Epoch ms of the last time the table was touched (delta preferred over full). */
export function lastSyncedAt(sync: SyncRecord): number | null {
    return sync.lastDeltaSyncAt ?? sync.lastFullSyncAt;
}

/** Stale when never synced, in an error state, or older than its TTL. */
export function isStale(sync: SyncRecord, nowMs: number): boolean {
    if (sync.status === 'error') return true;
    const at = lastSyncedAt(sync);
    if (at == null) return true;
    return nowMs - at > sync.ttlSeconds * 1000;
}

/** True when the tab's row count disagrees with what the source reports. */
export function hasDrift(sync: SyncRecord): boolean {
    return sync.sourceCount != null && sync.sourceCount !== sync.rowCount;
}

/**
 * Advances the watermark: the max `updatedAt` seen across `records`, never below `prev`.
 * Compares as strings so ISO timestamps and lexicographically-ordered ids both work.
 */
export function nextCursor(
    records: Array<Record<string, unknown>>,
    updatedAtField: string | undefined,
    prev: string | null,
): string | null {
    if (!updatedAtField) return prev;
    let max = prev;
    for (const rec of records) {
        const value = rec[updatedAtField];
        if (value == null) continue;
        const s = value instanceof Date ? value.toISOString() : String(value);
        if (max == null || s > max) max = s;
    }
    return max;
}

/**
 * Deterministic, dependency-free content hash (cyrb53) over a row matrix — same rows ⇒ same
 * hash, so the store can skip an identical rewrite. Not cryptographic; collision-resistant
 * enough to gate a cache write.
 */
export function contentHash(matrix: unknown[][]): string {
    const text = matrix.map((row) => row.join('')).join('');
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
        const ch = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return n.toString(16).padStart(14, '0');
}

/**
 * Schema of the `_sync` table itself. `_raw` off — the control row IS the flat row, no full
 * object to keep. The store reads/writes control rows through the same port as any table.
 */
export const SYNC_SCHEMA: TableSchema<SyncRecord> = {
    name: '_sync',
    idField: 'table',
    columns: [
        'table', 'strategy', 'lastFullSyncAt', 'lastDeltaSyncAt', 'cursor',
        'rowCount', 'sourceCount', 'contentHash', 'ttlSeconds', 'status',
        'lastError', 'sdkVersion',
        'blobId', 'blobHash', 'sig', 'keyId', 'lastArchiveAt',
    ],
    raw: false,
};
