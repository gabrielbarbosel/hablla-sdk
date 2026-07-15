/**
 * Persistence port for the hot store (DIP) — the store core depends only on this interface,
 * so the same store runs on any backend: a Google Sheet via `SpreadsheetApp` in GAS, a node
 * sheets client headless, or memory in tests. A backend deals only in row matrices
 * (`[header, ...rows]`); all schema/projection/merge logic lives above it, in {@link HabllaStore}.
 * Mirrors the {@link StrategyCache}/{@link HabllaCache} pattern the rest of the SDK already uses.
 */
import type { ColumnValue } from './schema';

/** A full table dump: first row is the header, the rest are data rows. */
export type Matrix = ColumnValue[][];

/** Reads and replaces whole tables. Implementations own tab creation and grid sizing. */
export interface TableStore {
    /** Reads the matrix for a table (`[]` when the table doesn't exist yet). */
    read(table: string): Promise<Matrix>;
    /** Replaces the whole matrix for a table, creating it if absent. */
    write(table: string, matrix: Matrix): Promise<void>;
    /** Names of the tables that currently exist (optional; for diagnostics/migration). */
    tables?(): Promise<string[]>;
}

/**
 * In-memory {@link TableStore} — the headless/test default, like {@link MemoryStrategyCache}.
 * Deep-copies on read and write so callers can't mutate the backing store by reference.
 */
export class MemoryTableStore implements TableStore {
    private data = new Map<string, Matrix>();

    async read(table: string): Promise<Matrix> {
        const matrix = this.data.get(table);
        return matrix ? matrix.map((row) => [...row]) : [];
    }

    async write(table: string, matrix: Matrix): Promise<void> {
        this.data.set(table, matrix.map((row) => [...row]));
    }

    async tables(): Promise<string[]> {
        return [...this.data.keys()];
    }
}
