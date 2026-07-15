/**
 * HabllaStore — the orchestrator that turns a raw {@link TableStore} backend into the sheet-as-DB.
 * It owns the read-merge-project-write cycle and the `_sync` control table, over any set of
 * {@link TableSchema}s. Read-through (Fase 3) and write-through (Fase 4) both go through here:
 * `all()` to serve a tab, `upsert()` to fold fresh data in without losing what's there. Everything
 * below is runtime-agnostic — the clock is passed in, and I/O is delegated to the backend port.
 */
import type { TableSchema } from './schema';
import type { Matrix, TableStore } from './port';
import { projectMatrix, parseMatrix, headerFor } from './projection';
import { upsertAll, type Resolver } from './merge';
import {
    type SyncRecord,
    type SyncStrategy,
    SYNC_SCHEMA,
    makeSyncRecord,
    coerceSyncRecord,
    contentHash,
    nextCursor,
    isStale,
} from './sync';

/** Options for {@link HabllaStore}. */
export interface HabllaStoreOptions {
    /** Stamped into every control row it writes, for provenance. */
    sdkVersion?: string;
}

/** Extra inputs for an {@link HabllaStore.upsert}. */
export interface UpsertOptions<E> {
    /** Wall clock (epoch ms). Passed in so the core stays clock-free and testable. */
    now: number;
    /** How this table is kept up to date (recorded in `_sync`). */
    strategy?: SyncStrategy;
    /** What the source says it holds — enables drift detection. */
    sourceCount?: number;
    /** Custom collision resolver (defaults to the schema's updatedAt rule). */
    resolver?: Resolver<E>;
}

/** Result of an upsert: what got written and the refreshed control row. */
export interface UpsertResult<E> {
    entities: E[];
    changed: boolean;
    sync: SyncRecord;
}

export class HabllaStore {
    private schemas = new Map<string, TableSchema>();

    constructor(
        private readonly backend: TableStore,
        schemas: TableSchema[] = [],
        private readonly options: HabllaStoreOptions = {},
    ) {
        for (const schema of schemas) this.register(schema);
    }

    /** Registers (or replaces) a table schema. Returns this for chaining. */
    register(schema: TableSchema): this {
        this.schemas.set(schema.name, schema);
        return this;
    }

    private schemaOf<E>(table: string): TableSchema<E> {
        const schema = this.schemas.get(table);
        if (!schema) throw new Error(`HabllaStore: tabela "${table}" não registrada.`);
        return schema as TableSchema<E>;
    }

    /** Every registered table name (the `_sync` control table is implicit, not listed here). */
    tableNames(): string[] {
        return [...this.schemas.keys()];
    }

    /**
     * Creates the tab for every registered table (plus `_sync`) when it's missing, seeding it
     * with just the header row — the "criação/migração das abas". Existing tabs are left untouched
     * (no data loss). Runtime-agnostic: the backend's `write` is what materializes a tab. Returns
     * the names of the tables it created.
     */
    async migrate(): Promise<string[]> {
        const created: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SYNC_SCHEMA<SyncRecord> vs registered<Record> só se unificam em any; só lemos name/header.
        const schemas: TableSchema<any>[] = [...this.schemas.values(), SYNC_SCHEMA];
        for (const schema of schemas) {
            const existing = await this.backend.read(schema.name);
            if (existing.length) continue;
            await this.backend.write(schema.name, [headerFor(schema)]);
            created.push(schema.name);
        }
        return created;
    }

    /** All entities currently stored for a table (parsed from its rows; `[]` when empty). */
    async all<E = Record<string, unknown>>(table: string): Promise<E[]> {
        const schema = this.schemaOf<E>(table);
        return parseMatrix(schema, await this.backend.read(table));
    }

    /**
     * Folds `incoming` into a table: reads what's there, upserts by id (resolver decides
     * collisions), rewrites only when the projected content actually changed, and refreshes
     * the `_sync` control row (cursor watermark, counts, hash, timestamps). Idempotent — the
     * same batch twice writes once.
     */
    async upsert<E = Record<string, unknown>>(
        table: string,
        incoming: E[],
        opts: UpsertOptions<E>,
    ): Promise<UpsertResult<E>> {
        const schema = this.schemaOf<E>(table);
        const existing = await this.all<E>(table);
        const merged = upsertAll(schema, existing, incoming, opts.resolver);
        const matrix = projectMatrix(schema, merged);
        const hash = contentHash(matrix);

        const prev = await this.syncOf(table);
        const changed = !prev || prev.contentHash !== hash;
        if (changed) await this.backend.write(table, matrix);

        const strategy = opts.strategy ?? prev?.strategy ?? 'full';
        const sync = makeSyncRecord({
            ...(prev ?? {}),
            table,
            strategy,
            rowCount: merged.length,
            sourceCount: opts.sourceCount ?? prev?.sourceCount ?? null,
            contentHash: hash,
            cursor: nextCursor(
                incoming as Array<Record<string, unknown>>,
                schema.updatedAtField,
                prev?.cursor ?? null,
            ),
            lastFullSyncAt: strategy === 'full' ? opts.now : (prev?.lastFullSyncAt ?? null),
            lastDeltaSyncAt: strategy === 'full' ? (prev?.lastDeltaSyncAt ?? null) : opts.now,
            status: 'ok',
            lastError: null,
            sdkVersion: this.options.sdkVersion ?? prev?.sdkVersion ?? null,
        });
        await this.writeSync(sync);
        return { entities: merged, changed, sync };
    }

    /** The control row for a table (null when never synced). */
    async syncOf(table: string): Promise<SyncRecord | null> {
        const rows = parseMatrix(SYNC_SCHEMA, await this.backend.read(SYNC_SCHEMA.name));
        const row = rows.find((r) => String(r.table) === table);
        return row ? coerceSyncRecord(row as unknown as Record<string, unknown>) : null;
    }

    /** Every control row, keyed by table — the "última atualização de cada entidade" view. */
    async syncAll(): Promise<Record<string, SyncRecord>> {
        const rows = parseMatrix(SYNC_SCHEMA, await this.backend.read(SYNC_SCHEMA.name));
        const out: Record<string, SyncRecord> = {};
        for (const row of rows) out[String(row.table)] = coerceSyncRecord(row as unknown as Record<string, unknown>);
        return out;
    }

    /** Fresh enough to serve from cache? (Unknown/stale tables ⇒ false — go to the API.) */
    async isFresh(table: string, nowMs: number): Promise<boolean> {
        const sync = await this.syncOf(table);
        return sync != null && !isStale(sync, nowMs);
    }

    /** Records that a table's sync failed, without touching its data — read-through can still serve stale. */
    async markError(table: string, message: string): Promise<SyncRecord> {
        const prev = await this.syncOf(table);
        const sync = makeSyncRecord({ ...(prev ?? {}), table, status: 'error', lastError: message });
        await this.writeSync(sync);
        return sync;
    }

    /** Upserts one control row into the `_sync` table (idempotent, keyed by table name). */
    private async writeSync(record: SyncRecord): Promise<void> {
        const existing = parseMatrix<SyncRecord>(SYNC_SCHEMA, await this.backend.read(SYNC_SCHEMA.name));
        const merged = upsertAll(SYNC_SCHEMA, existing, [record], () => true);
        const matrix: Matrix = projectMatrix(SYNC_SCHEMA, merged);
        await this.backend.write(SYNC_SCHEMA.name, matrix);
    }
}
