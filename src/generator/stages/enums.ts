/**
 * Generator stage: ENUM EXTRACTION.
 *
 * Harvests every enumerated value-set the resolved spec carries (query/path
 * parameters and component-schema properties) and materializes the domain ones
 * as `gen_enums.ts` — one `as const` array of `{ code }` rows per enum, plus its
 * union `…Code` type. The VALUES come 100% from the spec (so a new status the
 * API adds flows in on the next codegen run, no hand edit); only the NAME is
 * derived, from the most descriptive owner field (`status`/`type`/`*_type` beat
 * generic fields like `name`/`user`). The array-of-rows shape is deliberately the
 * lookup-table form a DB/sheet consumer seeds `ref_*` tables from.
 *
 * Pure (no I/O beyond the file write in {@link emitEnumsFile}); the resolved
 * spec is the single source, so the same registry types the resource params.
 */

import type { OpenApiSpec } from '../extract';
import { HTTP_METHODS } from '../extract';
import { ENUM_ALIASES } from '../overrides/enum-aliases';

/** A minimal schema view — only the fields enum extraction reads. */
interface EnumSchema {
    type?: string;
    enum?: unknown[];
    items?: EnumSchema;
    properties?: Record<string, EnumSchema>;
    [key: string]: unknown;
}

/** One enum's owner: the resource (tag/schema) and the field carrying it. */
interface EnumOwner {
    resource: string;
    field: string;
    count: number;
}

/** How an enum got its name: the descriptive owner field, a curated alias, or an unresolved collision. */
export type EnumNameSource = 'field' | 'alias' | 'ambiguous';

/** A resolved enum ready to emit and to type params with. */
export interface EnumDef {
    /** PascalCase name, e.g. `ServiceStatus`. */
    name: string;
    /** Values in first-seen order (the emitted rows). */
    values: string[];
    /** Sorted-joined value-set — the stable identity/dedup key. */
    key: string;
    /** Every (resource, field) that carries this value-set. */
    owners: EnumOwner[];
    /** Where the name came from. `ambiguous` = a collision the spec can't resolve and no alias covers (flagged in the report). */
    source: EnumNameSource;
}

/** Sort/pagination params whose enums are not domain value-sets. */
const SORT_PARAMS = new Set(['order', 'direction_order', 'page', 'order_by', 'field_date', 'sort', 'retrieve_mode', 'populate']);

/** Directions that read as an enum but are ordering, not a domain value-set. */
const DIRECTION_VALUES = new Set(['asc', 'desc', 'older', 'newest']);

/** Owner fields that describe nothing about the values — never name an enum after these. */
const GENERIC_FIELDS = new Set(['name', 'user', 'person', 'search', 'project', 'flow', 'board', 'rating', 'is_template', 'no_sector', 'key', 'target', 'update_rule', 'has_next_task', 'product', 'category']);

/** Split a kebab/snake/space string into words. */
function words(input: string): string[] {
    return input.split(/[-_\s]+/).filter(Boolean);
}

/** PascalCase a kebab/snake string. */
function pascalCase(input: string): string {
    return words(input).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

/** Singularize a noun, leaving `status`/`-us`/`-ss` intact and mapping `-uses` -> `-us` (`statuses` -> `status`). */
function singularize(word: string): string {
    if (/status$/i.test(word)) return word;
    if (/uses$/i.test(word)) return word.slice(0, -2);
    if (/ss$/i.test(word) || /us$/i.test(word)) return word;
    if (/ies$/.test(word)) return word.replace(/ies$/, 'y');
    if (/s$/.test(word)) return word.replace(/s$/, '');
    return word;
}

/** `{Resource}{Field}`, collapsing the doubled prefix when the field already leads with the resource (e.g. `events` + `event_type` -> `EventType`, not `EventEventType`). */
function enumName(resource: string, field: string): string {
    const resourcePascal = pascalCase(singularize(resource));
    const fieldPascal = pascalCase(singularize(field));
    return fieldPascal.startsWith(resourcePascal) ? fieldPascal : resourcePascal + fieldPascal;
}

/** How well a field name describes the enum it carries (higher = more descriptive). */
function fieldScore(field: string): number {
    if (field === 'status' || field === 'type') return 100;
    if (/_(status|type)$/.test(field)) return 90;
    if (/(status|type|kind|mode|level|state|role|currency_code|direction|priority)$/.test(field)) return 60;
    if (GENERIC_FIELDS.has(field)) return 0;
    return 20;
}

/**
 * Whether a param/field name is descriptive enough to carry a generated enum type.
 * The bundle-derived spec sometimes over-enumerates a generic carrier (a `user`
 * param whose schema lists channels), so only genuinely descriptive names
 * (`status`, `type`, `*_type`, `statuses` -> `status`) adopt the enum type; generic
 * carriers stay `string`.
 */
export function isDescriptiveField(field: string): boolean {
    return fieldScore(singularize(field)) >= 60;
}

/** True for value-sets that are date/field selectors or directions, not domain enums. */
function isPseudoEnum(values: string[]): boolean {
    if (values.every((v) => DIRECTION_VALUES.has(v))) return true;
    const dateish = values.filter((v) => /(_at|_date)$/.test(v)).length;
    return dateish >= Math.ceil(values.length * 0.6);
}

/** Read the enum array off a schema (direct or on array items), if any. */
function enumOf(schema: EnumSchema | undefined): string[] | undefined {
    if (!schema) return undefined;
    const raw = Array.isArray(schema.enum) ? schema.enum : Array.isArray(schema.items?.enum) ? schema.items!.enum : undefined;
    if (!raw) return undefined;
    const values = [...new Set(raw.filter((v): v is string => typeof v === 'string'))];
    return values.length >= 2 ? values : undefined;
}

/** Accumulate one occurrence into the value-set map. */
function record(map: Map<string, { values: string[]; owners: Map<string, EnumOwner> }>, values: string[], resource: string, field: string): void {
    const key = [...values].sort().join('|');
    let entry = map.get(key);
    if (!entry) {
        entry = { values, owners: new Map() };
        map.set(key, entry);
    }
    const ownerKey = `${resource}.${field}`;
    const owner = entry.owners.get(ownerKey) ?? { resource, field, count: 0 };
    owner.count++;
    entry.owners.set(ownerKey, owner);
}

/** Pick the owner field to name the enum after — most descriptive, then shortest. */
function chooseOwner(owners: EnumOwner[]): EnumOwner {
    return [...owners].sort((a, b) => {
        const sa = fieldScore(a.field);
        const sb = fieldScore(b.field);
        if (sa !== sb) return sb - sa;
        if (a.field.length !== b.field.length) return a.field.length - b.field.length;
        if (a.field !== b.field) return a.field < b.field ? -1 : 1;
        return b.count - a.count;
    })[0]!;
}

/**
 * Build the domain-enum registry from a resolved spec: dedup by value-set, drop
 * sort/date pseudo-enums, name each after its most descriptive owner field, and
 * resolve name collisions deterministically.
 */
export function buildEnumRegistry(spec: OpenApiSpec): EnumDef[] {
    const map = new Map<string, { values: string[]; owners: Map<string, EnumOwner> }>();

    for (const [, item] of Object.entries(spec.paths ?? {})) {
        for (const http of HTTP_METHODS) {
            const op = item[http];
            if (!op) continue;
            const resource = (op.tags?.[0] as string | undefined) ?? 'root';
            for (const raw of (op.parameters ?? []) as Array<{ name?: string; in?: string; schema?: EnumSchema }>) {
                if (!raw.name || SORT_PARAMS.has(raw.name)) continue;
                const values = enumOf(raw.schema);
                if (values) record(map, values, resource, raw.name);
            }
        }
    }

    const schemas = (spec.components?.schemas ?? {}) as Record<string, EnumSchema>;
    for (const [schemaName, schema] of Object.entries(schemas)) {
        for (const [field, prop] of Object.entries(schema.properties ?? {})) {
            const values = enumOf(prop);
            if (values) record(map, values, schemaName, field);
        }
    }

    // A (resource, field) that carries more than one distinct value-set is
    // overloaded: the field name cannot name the enum (e.g. `services.type` holds
    // the message-type, the origin and the channel). Aliased value-sets are
    // excluded from the count — an alias claims that meaning and frees the field
    // name for whatever single value-set is left (so `connections.type` still
    // yields `ConnectionType` once its channel meaning is aliased away).
    const valueSetsPerField = new Map<string, Set<string>>();
    for (const [key, entry] of map) {
        if (isPseudoEnum(entry.values) || ENUM_ALIASES[key]) continue;
        for (const owner of entry.owners.values()) {
            const field = `${owner.resource}.${owner.field}`;
            (valueSetsPerField.get(field) ?? valueSetsPerField.set(field, new Set()).get(field)!).add(key);
        }
    }

    const defs: EnumDef[] = [];
    for (const [key, entry] of map) {
        if (isPseudoEnum(entry.values)) continue;
        const owners = [...entry.owners.values()];

        const alias = ENUM_ALIASES[key];
        if (alias) {
            defs.push({ name: alias, values: entry.values, key, owners, source: 'alias' });
            continue;
        }

        const chosen = chooseOwner(owners);
        if (fieldScore(chosen.field) === 0) continue;
        const overloaded = (valueSetsPerField.get(`${chosen.resource}.${chosen.field}`)?.size ?? 0) > 1;
        defs.push({
            name: enumName(chosen.resource, chosen.field),
            values: entry.values,
            key,
            owners,
            source: overloaded ? 'ambiguous' : 'field',
        });
    }

    return resolveCollisions(defs);
}

/** Enums the spec could not name and no alias covers — the report surfaces these instead of trusting a guessed name. */
export function ambiguousEnums(defs: EnumDef[]): EnumDef[] {
    return defs.filter((def) => def.source === 'ambiguous');
}

/** Suffix colliding names with their owning resource, then an index — deterministic. */
function resolveCollisions(defs: EnumDef[]): EnumDef[] {
    const sorted = [...defs].sort((a, b) => (a.name !== b.name ? (a.name < b.name ? -1 : 1) : a.key < b.key ? -1 : 1));
    const used = new Set<string>();
    for (const def of sorted) {
        if (!used.has(def.name)) {
            used.add(def.name);
            continue;
        }
        const owner = chooseOwner(def.owners);
        let candidate = def.name + pascalCase(singularize(owner.resource));
        let i = 2;
        while (used.has(candidate)) candidate = `${def.name}${i++}`;
        def.name = candidate;
        used.add(candidate);
    }
    return sorted;
}

/** Look up the generated enum name for a raw enum value array, if it is a domain enum. */
export function enumNameFor(defs: EnumDef[], values: unknown[]): string | undefined {
    const strings = values.filter((v): v is string => typeof v === 'string');
    if (strings.length < 2) return undefined;
    const key = [...strings].sort().join('|');
    return defs.find((d) => d.key === key)?.name;
}

/** Render `gen_enums.ts` from the registry — one `as const` rows array + `…Code` type each. */
export function emitEnumsFile(defs: EnumDef[]): string {
    const ordered = [...defs].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const blocks = ordered.map((def) => {
        const owners = def.owners.map((o) => `${o.resource}.${o.field}`).join(', ');
        const rows = def.values.map((code) => `    { code: '${code}' },`).join('\n');
        return [
            '/**',
            ` * ${def.name} — generated from openapi.json.`,
            ` * Used by: ${owners}.`,
            ' */',
            `export const ${def.name} = [`,
            rows,
            '] as const;',
            `export type ${def.name}Code = (typeof ${def.name})[number]['code'];`,
        ].join('\n');
    });
    return [
        '/** Domain enums extracted from openapi.json (generated — do not edit by hand). */',
        '',
        blocks.join('\n\n'),
        '',
    ].join('\n');
}
