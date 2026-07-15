/**
 * Projection between entities and flat rows — the generalization of the tracking app's
 * `projection.js`, now driven by a {@link TableSchema} instead of a hardcoded column list.
 * The row matrix (`[header, ...rows]`) is what the hot store writes to a tab; `_raw` keeps
 * the full object so a row round-trips back to the entity with nothing lost. The matrix is
 * DERIVED and rebuildable — the entity (via `_raw`) stays the source of truth for a row.
 */
import {
    type ColumnValue,
    type TableSchema,
    RAW_COLUMN,
    toSpec,
    keepsRaw,
    columnValue,
    toCell,
} from './schema';

/** Ordered header for a schema: hot column names, then `_raw` when enabled. */
export function headerFor<E>(schema: TableSchema<E>): string[] {
    const names = schema.columns.map((c) => toSpec(c).name);
    return keepsRaw(schema) ? [...names, RAW_COLUMN] : names;
}

/** Projects one entity to a row aligned with {@link headerFor} (hot cells, then `_raw` JSON). */
export function projectRow<E>(schema: TableSchema<E>, entity: E): ColumnValue[] {
    const cells = schema.columns.map((c) => toCell(columnValue(toSpec(c), entity)));
    return keepsRaw(schema) ? [...cells, JSON.stringify(entity)] : cells;
}

/** Full matrix `[header, ...rows]` for a batch — ready for the hot store / a TSV. */
export function projectMatrix<E>(schema: TableSchema<E>, entities: E[]): ColumnValue[][] {
    return [headerFor(schema), ...entities.map((e) => projectRow(schema, e))];
}

/**
 * Reconstructs an entity from a stored row. Prefers `_raw` (lossless); when `_raw` is off
 * (anonymized/cold-split tables) it assembles a shallow record from the hot columns keyed
 * by header. Returns `null` for a blank/idless row so callers can skip padding rows.
 */
export function parseRow<E = Record<string, unknown>>(
    schema: TableSchema<E>,
    header: string[],
    row: ColumnValue[],
): E | null {
    const rawIdx = header.indexOf(RAW_COLUMN);
    if (rawIdx >= 0) {
        const raw = row[rawIdx];
        if (typeof raw === 'string' && raw) {
            try {
                return JSON.parse(raw) as E;
            } catch {
                /* fall through to column assembly */
            }
        }
    }
    const record: Record<string, ColumnValue> = {};
    let empty = true;
    header.forEach((name, i) => {
        if (name === RAW_COLUMN) return;
        const value = row[i] ?? null;
        record[name] = value;
        if (value !== null && value !== '') empty = false;
    });
    return empty ? null : (record as E);
}

/** Parses a full matrix `[header, ...rows]` back to entities (drops blank rows). */
export function parseMatrix<E = Record<string, unknown>>(
    schema: TableSchema<E>,
    matrix: ColumnValue[][],
): E[] {
    if (!matrix.length) return [];
    const header = (matrix[0] ?? []).map(String);
    const rows = matrix.slice(1);
    const out: E[] = [];
    for (const row of rows) {
        const entity = parseRow(schema, header, row);
        if (entity !== null) out.push(entity);
    }
    return out;
}
