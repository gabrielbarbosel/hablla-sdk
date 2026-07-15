/**
 * The store layer: the planilha-as-DB core. A {@link HabllaStore} over a runtime's
 * {@link TableStore} turns entities into hot rows (hot columns + `_raw`), upserts them by
 * id, and tracks freshness in a `_sync` control table — the foundation for read-through
 * (Fase 3) and write-through (Fase 4). Runtime-agnostic; the GAS/node backends and the
 * cold store plug in later without touching this core.
 */
export type { ColumnValue, ColumnSpec, ColumnInput, TableSchema } from './schema';
export { RAW_COLUMN, toSpec, keepsRaw, columnValue, toCell } from './schema';

export { headerFor, projectRow, projectMatrix, parseRow, parseMatrix } from './projection';

export type { Resolver } from './merge';
export { updatedAtResolver, upsertAll, idOf, sortByDesc } from './merge';

export type { SyncRecord, SyncStrategy, SyncStatus } from './sync';
export {
    SYNC_SCHEMA,
    makeSyncRecord,
    coerceSyncRecord,
    lastSyncedAt,
    isStale,
    hasDrift,
    nextCursor,
    contentHash,
} from './sync';

export type { Matrix, TableStore } from './port';
export { MemoryTableStore } from './port';

export type {
    HabllaStoreOptions, UpsertOptions, UpsertResult,
    ReadSource, ReadThroughOptions, ReadThroughResult,
} from './store';
export { HabllaStore } from './store';

export {
    SECTORS_SCHEMA, USERS_SCHEMA, CONNECTIONS_SCHEMA, FLOWS_SCHEMA, TAGS_SCHEMA,
    REASONS_SCHEMA, CUSTOM_FIELDS_SCHEMA, CAMPAIGNS_SCHEMA,
    PERSONS_SCHEMA, FLOWS_EXECUTIONS_SCHEMA, DISPATCH_RUNS_SCHEMA, DISPATCH_LEDGER_SCHEMA,
    DIMENSION_SCHEMAS, FACT_SCHEMAS, STORE_SCHEMAS, STORE_SCHEMAS_BY_NAME,
} from './schemas';
