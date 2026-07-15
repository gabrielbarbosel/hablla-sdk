/**
 * Colunas dinâmicas — "todos os campos" em vez de um subconjunto curado. Varre os registros,
 * achata os aninhados em dot-notation (`user.name`, `data.phone_number`, `processed_status.done`)
 * e monta um {@link TableSchema} com UMA coluna por campo descoberto (união de todas as chaves,
 * na ordem de primeira aparição). Arrays viram JSON na célula; o `_raw` segue guardando o objeto
 * inteiro (round-trip lossless). Runtime-agnóstico — roda igual no GAS e no Node.
 */
import type { ColumnInput, TableSchema } from './schema';

/** Coleta as chaves FOLHA de um objeto, achatando objetos aninhados em dot-notation. */
export function flatKeys(obj: unknown, prefix = '', keys: string[] = []): string[] {
    if (obj == null || typeof obj !== 'object') return keys;
    for (const key of Object.keys(obj as Record<string, unknown>)) {
        const val = (obj as Record<string, unknown>)[key];
        const full = prefix ? `${prefix}.${key}` : key;
        if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
            flatKeys(val, full, keys);
        } else {
            keys.push(full);
        }
    }
    return keys;
}

/** União ordenada (primeira aparição) das chaves folha de todos os registros. */
export function autoColumns(records: unknown[]): string[] {
    const seen = new Set<string>();
    const cols: string[] = [];
    for (const rec of records) {
        for (const key of flatKeys(rec)) {
            if (!seen.has(key)) {
                seen.add(key);
                cols.push(key);
            }
        }
    }
    return cols;
}

/** Lê um caminho dot-notation de um objeto, null-safe (folha ausente → null). */
export function getPath(obj: unknown, path: string): unknown {
    let cur: unknown = obj;
    for (const part of path.split('.')) {
        if (cur == null || typeof cur !== 'object') return null;
        cur = (cur as Record<string, unknown>)[part];
    }
    return cur ?? null;
}

/** Opções de {@link dynamicSchema}. */
export interface DynamicSchemaOptions {
    /** Campo id (chave de upsert). Default `id`. */
    idField?: string;
    /** Campo de updatedAt (watermark do incremental / resolução de conflito). */
    updatedAtField?: string;
    /** Manter a coluna `_raw` (default true — round-trip lossless). */
    raw?: boolean;
}

/**
 * Monta um {@link TableSchema} com TODAS as colunas descobertas nos registros (cada uma lida via
 * {@link getPath} do dot-path). O `_raw` fica ligado por padrão, então mesmo que as colunas mudem
 * entre syncs a reconstrução da entidade continua exata.
 */
export function dynamicSchema<E = Record<string, unknown>>(
    name: string,
    records: unknown[],
    opts: DynamicSchemaOptions = {},
): TableSchema<E> {
    const columns: ColumnInput<E>[] = autoColumns(records).map((col) => ({
        name: col,
        get: (entity: E) => getPath(entity, col),
    }));
    return {
        name,
        idField: opts.idField ?? 'id',
        updatedAtField: opts.updatedAtField,
        columns,
        raw: opts.raw ?? true,
    };
}
