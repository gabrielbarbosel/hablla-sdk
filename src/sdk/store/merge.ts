/**
 * Upsert-by-id — the generalization of the tracking app's `merge()`. Keyed by the schema's
 * `idField`; a pluggable {@link Resolver} decides who wins a collision. The default resolver
 * keeps the row with the newer `updatedAt` (a reprocess can only move forward, never lose a
 * fresher record), mirroring the monotonic ledger. Operates on ENTITIES, not rows — the store
 * parses rows to entities first, so merge never has to understand the sheet layout.
 */
import { type TableSchema, columnValue, toSpec } from './schema';

/** Decides a collision: returns true when `incoming` should replace `existing`. */
export type Resolver<E> = (incoming: E, existing: E) => boolean;

/** Comparable epoch for an entity's updatedAt (missing → -Infinity, so it always loses). */
function updatedAt<E>(entity: E, field: string): number {
    const value = (entity as Record<string, unknown>)[field];
    if (value == null) return -Infinity;
    if (typeof value === 'number') return value;
    const ms = Date.parse(String(value));
    return Number.isNaN(ms) ? -Infinity : ms;
}

/**
 * Default resolver: newer `updatedAt` wins; on a tie (or no updatedAt field) the incoming
 * record wins, so a re-fetch of the same watermark refreshes in place.
 */
export function updatedAtResolver<E>(updatedAtField?: string): Resolver<E> {
    if (!updatedAtField) return () => true;
    return (incoming, existing) => updatedAt(incoming, updatedAtField) >= updatedAt(existing, updatedAtField);
}

/** Reads the id used as the upsert key. */
export function idOf<E>(schema: TableSchema<E>, entity: E): string {
    const value = (entity as Record<string, unknown>)[schema.idField];
    return value == null ? '' : String(value);
}

/**
 * Merges `incoming` over `existing`, deduped by id, resolver deciding collisions. Insertion
 * order follows first-seen id, so a stable set of rows keeps a stable order across syncs.
 * Idless records are dropped (a table's rows must be addressable). Defaults to the
 * updatedAt resolver derived from the schema.
 */
export function upsertAll<E>(
    schema: TableSchema<E>,
    existing: E[],
    incoming: E[],
    resolver: Resolver<E> = updatedAtResolver(schema.updatedAtField),
): E[] {
    const by = new Map<string, E>();
    for (const entity of existing) {
        const id = idOf(schema, entity);
        if (id) by.set(id, entity);
    }
    for (const entity of incoming) {
        const id = idOf(schema, entity);
        if (!id) continue;
        const prev = by.get(id);
        if (!prev || resolver(entity, prev)) by.set(id, entity);
    }
    return [...by.values()];
}

/** Sorts entities by a hot column descending (e.g. most recent first). Stable, non-mutating. */
export function sortByDesc<E>(schema: TableSchema<E>, column: string, entities: E[]): E[] {
    const spec = schema.columns.map(toSpec).find((c) => c.name === column);
    const read = (e: E) => (spec ? columnValue(spec, e) : (e as Record<string, unknown>)[column]);
    return [...entities].sort((a, b) => String(read(b) ?? '').localeCompare(String(read(a) ?? '')));
}
