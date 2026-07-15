/**
 * The table catalog — every tab of the sheet-as-DB as a concrete {@link TableSchema}, exactly
 * as documented in `hablla-workspace/docs/storage`. One tab = one table = one entity. Dimensions
 * mirror in full (small, slow-moving); facts are large/event-shaped. Two tables are deliberately
 * anonymized — `persons` and `flows_executions` keep `raw: false` so NO PII or full payload ever
 * lands in the sheet or git; the complete record goes to the encrypted cold store (Fase 5), joined
 * back by `personToken`/`cold_ref`. Entities stay loosely typed here — the API shapes live in the
 * generated resources; a schema only needs the hot column names + the id/updatedAt keys.
 */
import type { TableSchema } from './schema';

/** Dimensions — full mirror (mudam devagar). */
export const SECTORS_SCHEMA: TableSchema = {
    name: 'sectors',
    idField: 'id',
    updatedAtField: 'updatedAt',
    columns: ['id', 'name', 'active', 'updatedAt'],
};

export const USERS_SCHEMA: TableSchema = {
    name: 'users',
    idField: 'id',
    updatedAtField: 'updatedAt',
    columns: ['id', 'name', 'email', 'role', 'active', 'updatedAt'],
};

export const CONNECTIONS_SCHEMA: TableSchema = {
    name: 'connections',
    idField: 'id',
    updatedAtField: 'updatedAt',
    columns: ['id', 'name', 'channel', 'number', 'status', 'updatedAt'],
};

export const FLOWS_SCHEMA: TableSchema = {
    name: 'flows',
    idField: 'id',
    updatedAtField: 'updatedAt',
    columns: ['id', 'name', 'status', 'varCount', 'updatedAt'],
};

export const TAGS_SCHEMA: TableSchema = {
    name: 'tags',
    idField: 'id',
    updatedAtField: 'updatedAt',
    columns: ['id', 'name', 'color', 'updatedAt'],
};

export const REASONS_SCHEMA: TableSchema = {
    name: 'reasons',
    idField: 'id',
    updatedAtField: 'updatedAt',
    columns: ['id', 'name', 'sectorId', 'updatedAt'],
};

export const CUSTOM_FIELDS_SCHEMA: TableSchema = {
    name: 'custom_fields',
    idField: 'id',
    updatedAtField: 'updatedAt',
    columns: ['id', 'key', 'label', 'type', 'updatedAt'],
};

export const CAMPAIGNS_SCHEMA: TableSchema = {
    name: 'campaigns',
    idField: 'id',
    updatedAtField: 'updatedAt',
    columns: ['id', 'name', 'status', 'connectionId', 'sectorId', 'createdAt', 'updatedAt'],
};

/**
 * Facts — persons: ANONYMIZED. Hot row carries only the joinable/queryable fields keyed by
 * `personToken`; `raw: false` so the telefone/nome never touch the sheet. The full record lives
 * in the cold store, reachable through `cold_ref` + the pseudonym key.
 */
export const PERSONS_SCHEMA: TableSchema = {
    name: 'persons',
    idField: 'personToken',
    updatedAtField: 'updatedAt',
    columns: ['personToken', 'ownerId', 'sectorId', 'tags', 'lastDispatchAt', 'updatedAt', 'cold_ref'],
    raw: false,
};

/** Facts — flows_executions: LIGHT. Hot row is the summary keyed by `id`; full trace goes cold. */
export const FLOWS_EXECUTIONS_SCHEMA: TableSchema = {
    name: 'flows_executions',
    idField: 'id',
    updatedAtField: 'finishedAt',
    columns: ['id', 'flowId', 'status', 'startedAt', 'finishedAt', 'personToken', 'cold_ref'],
    raw: false,
};

/**
 * Facts — dispatch_runs: one row per disparo/lote (o header da campanha que NÓS rodamos, inclui
 * eras legadas que a API não registra). Write-through during a run; `_raw` keeps the full run.
 */
export const DISPATCH_RUNS_SCHEMA: TableSchema = {
    name: 'dispatch_runs',
    idField: 'runId',
    updatedAtField: 'finishedAt',
    columns: [
        'runId', 'campaignRef', 'label', 'templateId', 'connectionId', 'sectorId',
        'startedAt', 'finishedAt', 'engineVersion', 'ownerUserId',
        'countTotal', 'countSent', 'countDelivered', 'countRead', 'countFailed',
    ],
};

/**
 * Facts — dispatch_ledger: one row per contato (= a aba Rastreio), joined to persons by
 * `personToken`. Monotonic like the tracking ledger — higher confidence wins (Fase 4 wires the
 * confidence-aware resolver); `sentAt` is the watermark. Keeps `_raw` for the full record.
 */
export const DISPATCH_LEDGER_SCHEMA: TableSchema = {
    name: 'dispatch_ledger',
    idField: 'correlationId',
    updatedAtField: 'sentAt',
    columns: [
        'correlationId', 'runId', 'sentAt', 'status', 'delivered', 'read',
        'serviceId', 'personToken', 'confidence', 'matchBasis',
    ],
};

/** Every dimension schema, in mirror order. */
export const DIMENSION_SCHEMAS: TableSchema[] = [
    SECTORS_SCHEMA, USERS_SCHEMA, CONNECTIONS_SCHEMA, FLOWS_SCHEMA,
    TAGS_SCHEMA, REASONS_SCHEMA, CUSTOM_FIELDS_SCHEMA, CAMPAIGNS_SCHEMA,
];

/** Every fact schema. */
export const FACT_SCHEMAS: TableSchema[] = [
    PERSONS_SCHEMA, FLOWS_EXECUTIONS_SCHEMA, DISPATCH_RUNS_SCHEMA, DISPATCH_LEDGER_SCHEMA,
];

/** The whole catalog — hand these to `new HabllaStore(backend, STORE_SCHEMAS)`. */
export const STORE_SCHEMAS: TableSchema[] = [...DIMENSION_SCHEMAS, ...FACT_SCHEMAS];

/** Catalog indexed by table name. */
export const STORE_SCHEMAS_BY_NAME: Record<string, TableSchema> = Object.fromEntries(
    STORE_SCHEMAS.map((schema) => [schema.name, schema]),
);
