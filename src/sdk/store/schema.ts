/**
 * Table schema: how one entity maps to a flat row in the sheet-as-DB. Each entity
 * type gets a schema (one tab = one table). "Pegar tudo" without exploding columns:
 * a handful of HOT columns (the ones you query/join on) plus a single {@link RAW_COLUMN}
 * carrying the full object as JSON. The store projects entities to rows and parses rows
 * back to entities through this schema — it is the single source of the row shape, so
 * hot store, cold store and read-through all agree. Runtime-agnostic (no I/O here).
 */

/** A scalar a spreadsheet cell can hold. Non-scalars are JSON-encoded into a cell. */
export type ColumnValue = string | number | boolean | null;

/** One hot column: a name and how to pull its value out of the entity. */
export interface ColumnSpec<E = Record<string, unknown>> {
    /** Column header, and the default key read from the entity. */
    name: string;
    /** Custom extractor; defaults to `entity[name]`. Return a scalar (coerced to a cell). */
    get?: (entity: E) => unknown;
}

/** Loose form accepted when declaring columns: a bare name or a full spec. */
export type ColumnInput<E = Record<string, unknown>> = string | ColumnSpec<E>;

/** Declares a table: its id/updatedAt keys, hot columns, and whether to keep `_raw`. */
export interface TableSchema<E = Record<string, unknown>> {
    /** Table (tab) name — e.g. `sectors`, `persons`, `dispatch_ledger`. */
    name: string;
    /** Field holding the stable id; the upsert key (deduplicates and upgrades in place). */
    idField: string;
    /** Field holding the last-updated epoch/ISO; enables incremental sync + conflict resolution. */
    updatedAtField?: string;
    /** Hot columns projected for querying/joining. */
    columns: ColumnInput<E>[];
    /** Keep a `_raw` column with the full entity as JSON (default true). Off for anonymized/cold-split tables. */
    raw?: boolean;
}

/** The name of the JSON column that carries the full entity. */
export const RAW_COLUMN = '_raw';

/** Normalizes a {@link ColumnInput} to a {@link ColumnSpec}. */
export function toSpec<E>(input: ColumnInput<E>): ColumnSpec<E> {
    return typeof input === 'string' ? { name: input } : input;
}

/** Whether the schema keeps the `_raw` column (default true). */
export function keepsRaw<E>(schema: TableSchema<E>): boolean {
    return schema.raw !== false;
}

/** Reads a hot column's raw (uncoerced) value from an entity. */
export function columnValue<E>(spec: ColumnSpec<E>, entity: E): unknown {
    if (spec.get) return spec.get(entity);
    return (entity as Record<string, unknown>)[spec.name];
}

/**
 * Coerces any value into a spreadsheet cell: `null`/`undefined` → `null`, `Date` → ISO,
 * scalars pass through, everything else (object/array) → JSON. Faithful and reversible
 * enough for hot columns, which are meant to be scalar by contract.
 */
export function toCell(value: unknown): ColumnValue {
    if (value == null) return null;
    if (value instanceof Date) return value.toISOString();
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') return value as ColumnValue;
    return JSON.stringify(value);
}
