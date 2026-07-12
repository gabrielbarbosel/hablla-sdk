/**
 * Generator stage: EMIT.
 *
 * Turns the resolved OpenAPI spec (merged + overridden) into the SDK resource
 * files `src/sdk/resources/gen_*.ts`. Each file is a single class extending
 * `Resource`, with one typed method per operation, JSDoc `@method`/`@remarks`
 * tags, and — for tags that have a component schema — a leading `interface`
 * describing the entity.
 *
 * The emitted shape reproduces the current hand-verified resources exactly:
 *   - method signatures `name(pathParams…, body?, opts)` where every mutating
 *     verb (POST/PUT/PATCH) takes a `body` and every method takes an
 *     `opts: { query?: … }` argument;
 *   - `Promise<Paged<T>>` for list responses, `Promise<T>` for single-entity
 *     responses, `Promise<void>` for deletes, `Promise<unknown>` otherwise;
 *   - multipart/form-data operations become `name(file, fields?, opts?)`,
 *     building a `MultipartBody` — see {@link buildMethod} and the
 *     `campaigns/sheet` operation.
 *
 * Run after the extract pipeline has written `src/generator/openapi.json`.
 */

import * as fs from 'fs';
import * as path from 'path';

import { HTTP_METHODS, HttpMethod, OpenApiOperation, OpenApiSpec } from '../extract';

/**
 * Human one-liners for the entity interfaces, keyed by component-schema name.
 * The upstream spec carries no schema descriptions, so these are maintained
 * here (the emit is the only place they are consumed). A schema absent from
 * this map falls back to a generated `A <name>.` sentence.
 */
export const SCHEMA_DOC: Record<string, string> = {
    Annotation: 'An annotation attached to a person, card, service or organization.',
    AutomationRule: 'An automation rule.',
    BlockedWord: 'A blocked word.',
    Board: 'A board.',
    Campaign: 'A campaign.',
    Card: 'A card (deal / opportunity).',
    Class: 'A class (custom entity definition / code class).',
    Comment: 'A comment.',
    Connection: 'A connection (channel integration).',
    Credential: 'A credential (connection auth).',
    CustomField: 'A custom field definition.',
    Dictionary: 'A dictionary (custom entity definition).',
    Event: 'An event (activity record).',
    Flow: 'An automation flow.',
    FlowsExecution: 'A flow execution run.',
    HabllaAgent: 'A Hablla agent.',
    Holiday: 'A holiday entry.',
    KnowledgeBase: 'A knowledge base.',
    OfficeHour: 'An office-hours configuration.',
    Organization: 'An organization (company).',
    Permission: 'A permission profile.',
    Person: 'A person (contact).',
    Queue: 'A queue.',
    Reason: 'A reason (e.g. for a card or service outcome).',
    Root: 'A workspace (root entity).',
    Script: 'A script.',
    Sector: 'A sector.',
    Segmentation: 'A segmentation.',
    Service: 'A service (support/attendance ticket).',
    Session: 'A messaging session.',
    SyncDeleteRecord: 'A sync-delete record (tracks deleted objects for synchronization).',
    Tag: 'A tag.',
    Task: 'A task.',
    TempToken: 'A temporary access token.',
    TransferLog: 'A transfer log entry.',
    Trigger: 'An automation trigger.',
    Workspace: 'A workspace.',
    WorkspacesPlan: 'A workspace plan (subscription plan attached to a workspace).',
};

/**
 * PATCH/GET/DELETE action verbs that already read as an imperative, so the
 * emitted method keeps the action name verbatim instead of prefixing the HTTP
 * verb (e.g. `add-webchat` -> `addWebchat`, not `patchAddWebchat`). POST/PUT
 * always keep the action name, so they do not consult this set.
 */
const ACTION_VERBS = new Set(['add', 'remove', 'update', 'create', 'delete', 'make', 'publish', 'reorder', 'associate', 'merge', 'unsubscribe', 'move', 'enable', 'disable', 'sync']);

/** A minimal JSON-schema view — the emit only reads a handful of fields. */
interface JsonSchema {
    type?: string;
    $ref?: string;
    items?: JsonSchema;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    additionalProperties?: unknown;
    enum?: unknown[];
    [key: string]: unknown;
}

/** A query/path parameter, as read from an operation's `parameters`. */
interface Param {
    name: string;
    in: string;
    schema?: JsonSchema;
}

/** Everything the emitter needs about one operation, pre-resolved. */
interface Method {
    name: string;
    /**
     * The operation's class-unique `x-sdk-method` (the real bundle function
     * name). Used to break heuristic name collisions deterministically — see
     * {@link dedupeMethodNames}.
     */
    xSdkMethod: string;
    http: HttpMethod;
    path: string;
    version: number;
    depth: number;
    summary?: string;
    pathParams: string[];
    queryParams: Param[];
    returnType: string;
    hasBody: boolean;
    bodyType: string;
    multipart?: { fileField: string };
    /**
     * True for `getWithConfig` operations (`x-config-get`). The emitted call sets
     * `queryFormat: 'json'` so the HTTP client `JSON.stringify`s first-level
     * query objects (`?filters={...}`) as these endpoints require.
     */
    configGet?: boolean;
}

/** Split a kebab/snake/space string into its words. */
function words(input: string): string[] {
    return input.split(/[-_\s]+/).filter(Boolean);
}

/** PascalCase a kebab/snake string, e.g. `cost-centers` -> `CostCenters`. */
function pascalCase(input: string): string {
    return words(input).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

/** camelCase a kebab/snake string, e.g. `add-emails` -> `addEmails`. */
function camelCase(input: string): string {
    const pascal = pascalCase(input);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Naive English singularizer, good enough for the API's collection nouns. */
function singularize(word: string): string {
    if (/ies$/.test(word)) return word.replace(/ies$/, 'y');
    if (/(ches|shes|xes|zes|sses)$/.test(word)) return word.replace(/es$/, '');
    if (/ss$/.test(word)) return word;
    if (/s$/.test(word)) return word.replace(/s$/, '');
    return word;
}

/** camelCase a path-parameter name for use as a TS identifier. */
function paramIdent(raw: string): string {
    return raw.includes('_') ? camelCase(raw) : raw;
}

/** Strip the `/vN` and `/workspaces/{workspace_id}` prefixes off a path. */
function strip(pathStr: string): string {
    return pathStr.replace(/^\/v\d+/, '').replace(/^\/workspaces\/\{workspace_id\}/, '');
}

/** Segments of a path after {@link strip} (params included, e.g. `{id}`). */
function segmentsOf(pathStr: string): string[] {
    return strip(pathStr).split('/').filter(Boolean);
}

/** The `/vN` version number of a path (defaults to 1). */
function versionOf(pathStr: string): number {
    const m = pathStr.match(/^\/v(\d+)/);
    return m ? parseInt(m[1]!, 10) : 1;
}

/** Map a JSON-schema node to a TypeScript type for an interface field. */
function tsInterfaceType(schema: JsonSchema | undefined): string {
    if (!schema) return 'unknown';
    if (schema.$ref) return 'unknown';
    switch (schema.type) {
        case 'string':
            return 'string';
        case 'boolean':
            return 'boolean';
        case 'number':
        case 'integer':
            return 'number';
        case 'array':
            return `${tsInterfaceType(schema.items)}[]`;
        case 'object':
            return 'Record<string, unknown>';
        default:
            return 'unknown';
    }
}

/** Map a query parameter's schema to a TypeScript type. */
function tsParamType(schema: JsonSchema | undefined): string {
    if (!schema) return 'unknown';
    if (schema.type === 'array') return `${tsParamType(schema.items)}[]`;
    if (schema.type === 'number' || schema.type === 'integer') return 'number';
    if (schema.type === 'boolean') return 'boolean';
    if (schema.type === 'string') return 'string';
    return 'unknown';
}

/**
 * Derive the method name for an operation from its HTTP verb and path shape.
 *
 * Rules (matching the current resources):
 *   - collection `…/tag`        -> `list<Plural>` (GET) / `create<Singular>` etc.
 *   - item `…/noun/{id}`        -> `get|update|delete|patch|create<Singular(noun)>`
 *   - sub-action `…/{id}/verb`  -> `<verb>` (POST/PUT, and PATCH/GET/DELETE when
 *                                   the verb reads as an imperative), else the
 *                                   HTTP verb + PascalCase(action).
 * @param http Operation method.
 * @param pathStr Full operation path.
 * @param tag Operation tag (resource name).
 * @param schemaName Component-schema name for the tag, if any.
 */
export function methodName(http: HttpMethod, pathStr: string, tag: string, schemaName?: string): string {
    const segs = segmentsOf(pathStr);
    const verb = http.toLowerCase();
    const singularTag = schemaName ?? pascalCase(singularize(tag));
    const pluralTag = pascalCase(tag);

    let lastLit = -1;
    for (let i = segs.length - 1; i >= 0; i--) {
        if (!segs[i]!.startsWith('{')) {
            lastLit = i;
            break;
        }
    }
    if (lastLit === -1) return verb + singularTag;

    const noun = segs[lastLit]!;
    const hasId = segs.length - 1 > lastLit;
    const nounSingular = noun === tag ? singularTag : pascalCase(singularize(noun));
    const nounPascal = pascalCase(noun);

    if (hasId) {
        // An item under THIS resource's own collection (`…/campaigns/{id}`) reads
        // as CRUD (`get/update/delete<Singular>`); an item under a nested foreign
        // collection (`…/cards/{id}/products/{product_id}`) keeps the raw verb and
        // the collection noun verbatim (`deleteProducts`), matching the source.
        const own = noun === tag;
        switch (http) {
            case 'get':
                return 'get' + nounSingular;
            case 'post':
                return 'create' + nounSingular;
            case 'put':
                return own ? 'update' + singularTag : 'put' + nounPascal;
            case 'patch':
                return own ? 'patch' + singularTag : 'patch' + nounPascal;
            case 'delete':
                return own ? 'delete' + singularTag : 'delete' + nounPascal;
        }
    }

    if (noun === tag) {
        switch (http) {
            case 'get':
                return 'list' + pluralTag;
            case 'post':
                return 'create' + singularTag;
            case 'put':
                return 'update' + singularTag;
            case 'patch':
                return 'patch' + singularTag;
            case 'delete':
                return 'delete' + singularTag;
        }
    }

    const first = words(noun)[0]!.toLowerCase();
    switch (http) {
        case 'post':
            return camelCase(noun);
        case 'put':
            return ACTION_VERBS.has(first) ? camelCase(noun) : 'put' + nounPascal;
        case 'patch':
            return ACTION_VERBS.has(first) ? camelCase(noun) : 'patch' + nounPascal;
        case 'delete':
            return ACTION_VERBS.has(first) ? camelCase(noun) : 'delete' + nounPascal;
        case 'get':
            return ACTION_VERBS.has(first) ? camelCase(noun) : 'get' + nounPascal;
    }
    return verb + nounPascal;
}

/** Resolve the response schema for the 200/201 success of an operation. */
function successSchema(op: OpenApiOperation): JsonSchema | undefined {
    const responses = op.responses ?? {};
    for (const code of ['200', '201']) {
        const content = (responses[code] as { content?: Record<string, { schema?: JsonSchema }> } | undefined)?.content;
        const schema = content?.['application/json']?.schema;
        if (schema) return schema;
    }
    return undefined;
}

/** Ref target's short name, e.g. `#/components/schemas/Tag` -> `Tag`. */
function refName(ref: string): string {
    return ref.split('/').pop()!;
}

/**
 * Compute the `Promise<…>` payload type for an operation. Deletes are `void`;
 * a `{ results: [$ref] }` response is `Paged<T>`; a bare `$ref` is `T`; a ref
 * only counts when it points at THIS resource's own local interface. Everything
 * else is `unknown`.
 */
function returnType(op: OpenApiOperation, http: HttpMethod, schemaName?: string): string {
    if (http === 'delete') return 'void';
    const schema = successSchema(op);
    if (!schema) return 'unknown';
    if (schema.$ref && schemaName && refName(schema.$ref) === schemaName) return schemaName;
    const results = schema.properties?.results;
    if (results?.type === 'array' && results.items?.$ref && schemaName && refName(results.items.$ref) === schemaName) {
        return `Paged<${schemaName}>`;
    }
    return 'unknown';
}

/** True when the operation consumes multipart/form-data. */
function multipartField(op: OpenApiOperation): string | undefined {
    const content = (op.requestBody as { content?: Record<string, { schema?: JsonSchema }> } | undefined)?.content;
    const schema = content?.['multipart/form-data']?.schema;
    if (!schema) return undefined;
    const props = schema.properties ?? {};
    for (const [name, prop] of Object.entries(props)) {
        if (prop.type === 'string' && prop.format === 'binary') return name;
    }
    return Object.keys(props)[0];
}

/** Resolve an operation into the {@link Method} the emitter renders. */
function buildMethod(http: HttpMethod, pathStr: string, op: OpenApiOperation, tag: string, schemaName?: string): Method {
    const params = (op.parameters ?? []) as Param[];
    // Collapse repeated path-param placeholders to a single argument. A few
    // upstream routes are degenerate — the extract renders more than one
    // placeholder under the same name (`…/flows/{id}` whose workspace segment is
    // also `{id}`, or the minification artifact `…/office-hours/{Rn}`). Emitting
    // one arg per identical placeholder yields `(id, id)` / `path: { id, id }`,
    // which is invalid TS (TS2300/TS1117). Deduping by raw name keeps the emit
    // compiling and deterministic; these routes are flagged as spec-quality bugs
    // to fix in the extract/spec, not here.
    const rawPathParams = params.filter((p) => p.in === 'path' && p.name !== 'workspace_id').map((p) => p.name);
    const pathParams = rawPathParams.filter((name, index) => rawPathParams.indexOf(name) === index);
    const queryParams = params.filter((p) => p.in === 'query');
    const mp = ['post', 'put', 'patch'].includes(http) ? multipartField(op) : undefined;
    const hasBody = ['post', 'put', 'patch'].includes(http);
    const returns = returnType(op, http, schemaName);
    // The body is `Partial<Schema>` exactly when the operation traffics in the
    // entity (its response is the entity or a page of it); operations that only
    // return an opaque payload take a `Record<string, unknown>` body.
    const entityBody = schemaName && (returns === schemaName || returns === `Paged<${schemaName}>`);
    const bodyType = entityBody ? `Partial<${schemaName}>` : 'Record<string, unknown>';

    return {
        name: methodName(http, pathStr, tag, schemaName),
        xSdkMethod: (op['x-sdk-method'] as string | undefined) ?? '',
        http,
        path: pathStr,
        version: versionOf(pathStr),
        depth: segmentsOf(pathStr).length,
        summary: op.summary,
        pathParams,
        queryParams,
        returnType: returns,
        hasBody: hasBody && !mp,
        bodyType,
        multipart: mp ? { fileField: mp } : undefined,
        configGet: op['x-config-get'] === true,
    };
}

/** Disambiguate duplicate method names across API versions with a `V{n}` suffix. */
function applyVersionSuffixes(methods: Method[]): void {
    const byName = new Map<string, Method[]>();
    for (const m of methods) {
        const list = byName.get(m.name) ?? [];
        list.push(m);
        byName.set(m.name, list);
    }
    for (const list of byName.values()) {
        if (list.length < 2) continue;
        const maxVersion = Math.max(...list.map((m) => m.version));
        for (const m of list) {
            if (m.version < maxVersion) m.name = `${m.name}V${m.version}`;
        }
    }
}

/**
 * Guarantee no two methods in a class share a name (the TS2393 blocker). The
 * heuristic {@link methodName} can collide when a resource exposes both a
 * collection-level and an item-level action that read the same way — e.g.
 * `POST …/flows-executions/retry` and `POST …/flows-executions/{id}/retry` both
 * derive `retry`. Rather than re-derive every name by heuristic (which would
 * needlessly rename the non-colliding majority away from the hand-verified
 * resources), only the colliding methods are renamed, and they adopt their
 * `x-sdk-method` — the real bundle function name, which the extract stage
 * guarantees is unique within the class. A final deterministic pass (a
 * `By{PathParam}` suffix, then a numeric index) is a belt-and-braces guarantee
 * for the — currently non-existent — case where `x-sdk-method` is absent or
 * itself clashes with a sibling.
 */
function dedupeMethodNames(methods: Method[]): void {
    const counts = new Map<string, number>();
    for (const m of methods) counts.set(m.name, (counts.get(m.name) ?? 0) + 1);
    for (const m of methods) {
        if ((counts.get(m.name) ?? 0) > 1 && m.xSdkMethod) m.name = m.xSdkMethod;
    }
    const used = new Set<string>();
    for (const m of methods) {
        if (!used.has(m.name)) {
            used.add(m.name);
            continue;
        }
        const base = m.name;
        const suffix = m.pathParams.length ? 'By' + pascalCase(m.pathParams[m.pathParams.length - 1]!) : '';
        let candidate = base + suffix;
        let i = 2;
        while (used.has(candidate)) candidate = `${base}${suffix}${i++}`;
        m.name = candidate;
        used.add(candidate);
    }
}

/** Stable emit order: version asc, then deepest paths first, path asc, verb asc. */
function sortMethods(methods: Method[]): Method[] {
    const rank: Record<HttpMethod, number> = { delete: 0, get: 1, patch: 2, post: 3, put: 4 };
    return [...methods].sort((a, b) => {
        if (a.version !== b.version) return a.version - b.version;
        if (a.depth !== b.depth) return b.depth - a.depth;
        // Compare with `{param}` segments blanked so params sort before literals
        // (e.g. `/holidays/{id}` before `/holidays/filter`).
        const pa = strip(a.path).replace(/\{[^}]+\}/g, '');
        const pb = strip(b.path).replace(/\{[^}]+\}/g, '');
        if (pa !== pb) return pa < pb ? -1 : 1;
        return rank[a.http] - rank[b.http];
    });
}

/** Render the `interface` block for a tag that has a component schema. */
function emitInterface(schemaName: string, schema: JsonSchema): string {
    const doc = SCHEMA_DOC[schemaName] ?? `A ${schemaName}.`;
    const required = new Set(schema.required ?? []);
    const fields = Object.entries(schema.properties ?? {}).map(([name, prop]) => {
        const optional = required.has(name) ? '' : '?';
        return `    ${name}${optional}: ${tsInterfaceType(prop)};`;
    });
    if (schema.additionalProperties) fields.push('    [key: string]: unknown;');
    return [`/** ${doc} */`, `export interface ${schemaName} {`, ...fields, '}'].join('\n');
}

/** Build the JSDoc `@remarks` line documenting an operation's query params. */
function remarks(method: Method): string {
    if (method.queryParams.length === 0) {
        return '     * @remarks Any query params may be sent (none documented).';
    }
    const names = method.queryParams.map((p) => p.name).join(', ');
    return `     * @remarks Documented query: ${names} (extra keys allowed).`;
}

/** The `opts: { query?: … } = {}` argument, typed from the query params. */
function optsArg(method: Method): string {
    if (method.queryParams.length === 0) {
        return 'opts: { query?: Record<string, unknown> } = {}';
    }
    const shape = method.queryParams.map((p) => `${p.name}?: ${tsParamType(p.schema)}`).join('; ');
    return `opts: { query?: { ${shape} } & Record<string, unknown> } = {}`;
}

/** The `path: { … }` fragment of the call options for an operation's params. */
function pathFragment(pathParams: string[]): string {
    const parts = pathParams.map((raw) => {
        const ident = paramIdent(raw);
        return ident === raw ? ident : `${raw}: ${ident}`;
    });
    return `path: { ${parts.join(', ')} }`;
}

/** Render a single resource method (its JSDoc + implementation). */
function emitMethod(method: Method): string {
    const jsdoc: string[] = ['    /**'];

    if (method.multipart) {
        jsdoc.push(`     * ${method.name}. ${method.summary ?? ''}`.trimEnd());
        jsdoc.push(`     * @method ${method.http.toUpperCase()} ${method.path}`);
        jsdoc.push(remarks(method));
        jsdoc.push(`     * @param ${method.multipart.fileField} The spreadsheet file part (sent under the \`${method.multipart.fileField}\` field).`);
        jsdoc.push('     * @param fields Extra form-data text fields to send alongside the file.');
        jsdoc.push('     */');

        const args = [
            ...method.pathParams.map((p) => `${paramIdent(p)}: string`),
            'file: MultipartFile',
            'fields?: Record<string, string>',
            optsArg(method),
        ];
        const callParts: string[] = [];
        if (method.pathParams.length) callParts.push(pathFragment(method.pathParams));
        callParts.push('body', 'query: opts.query');
        return [
            jsdoc.join('\n'),
            `    ${method.name}(${args.join(', ')}): Promise<${method.returnType}> {`,
            `        const body: MultipartBody = { kind: 'multipart', fields, files: { ${method.multipart.fileField} } };`,
            `        return this.http.${method.http}('${method.path}', { ${callParts.join(', ')} });`,
            '    }',
        ].join('\n');
    }

    let doc = method.summary ?? `${method.name}`;
    if (!doc.endsWith('.')) doc += '.';
    jsdoc.push(`     * ${doc}`);
    jsdoc.push(`     * @method ${method.http.toUpperCase()} ${method.path}`);
    jsdoc.push(remarks(method));
    jsdoc.push('     */');

    const args = [
        ...method.pathParams.map((p) => `${paramIdent(p)}: string`),
        ...(method.hasBody ? [`body: ${method.bodyType}`] : []),
        optsArg(method),
    ];
    const callParts: string[] = [];
    if (method.pathParams.length) callParts.push(pathFragment(method.pathParams));
    if (method.hasBody) callParts.push('body');
    callParts.push('query: opts.query');
    if (method.configGet) callParts.push("queryFormat: 'json'");

    return [
        jsdoc.join('\n'),
        `    ${method.name}(${args.join(', ')}): Promise<${method.returnType}> {`,
        `        return this.http.${method.http}('${method.path}', { ${callParts.join(', ')} });`,
        '    }',
    ].join('\n');
}

/** A resource ready to render: its tag, class, optional schema, and methods. */
interface ResourceGroup {
    tag: string;
    className: string;
    schemaName?: string;
    schema?: JsonSchema;
    methods: Method[];
}

/** Render a whole resource file from a {@link ResourceGroup}. */
export function emitResourceFile(group: ResourceGroup): string {
    const methods = sortMethods(group.methods);
    const usesPaged = methods.some((m) => m.returnType.startsWith('Paged<'));
    const usesMultipart = methods.some((m) => m.multipart);

    const typeImports: string[] = [];
    if (usesPaged) typeImports.push('Paged');
    if (usesMultipart) typeImports.push('MultipartFile', 'MultipartBody');

    const lines: string[] = ["import { Resource } from './base';"];
    if (typeImports.length) lines.push(`import type { ${typeImports.join(', ')} } from '../core/types';`);
    lines.push('');
    if (group.schemaName && group.schema) {
        lines.push(emitInterface(group.schemaName, group.schema));
        lines.push('');
    }
    lines.push(`/** \`${group.tag}\` resource (generated from openapi.json). */`);
    lines.push(`export class ${group.className} extends Resource {`);
    lines.push(methods.map(emitMethod).join('\n\n'));
    lines.push('}');
    lines.push('');
    return lines.join('\n');
}

/** Group every operation in the spec into per-file resources. */
export function groupResources(spec: OpenApiSpec): ResourceGroup[] {
    const schemas = (spec.components?.schemas ?? {}) as Record<string, JsonSchema>;
    // Schemas key their owning tag under `x-tag`, but inconsistently cased
    // (`blocked-words` vs `blockedWords`), so match on the camelCase form — the
    // same key the resource files are grouped by.
    const schemaByTag = new Map<string, string>();
    for (const [name, schema] of Object.entries(schemas)) {
        const tag = schema['x-tag'] as string | undefined;
        if (tag) schemaByTag.set(camelCase(tag), name);
    }

    // Resources share a file when their tags collapse to the same camelCase key
    // (e.g. `products-prices` and `products_prices`).
    const groups = new Map<string, ResourceGroup>();
    for (const [pathStr, item] of Object.entries(spec.paths)) {
        for (const http of HTTP_METHODS) {
            const op = item[http];
            if (!op) continue;
            const tag = (op.tags?.[0] as string | undefined) ?? 'root';
            const fileKey = camelCase(tag);
            const schemaName = schemaByTag.get(camelCase(tag));

            let group = groups.get(fileKey);
            if (!group) {
                group = {
                    tag,
                    className: pascalCase(tag),
                    schemaName,
                    schema: schemaName ? schemas[schemaName] : undefined,
                    methods: [],
                };
                groups.set(fileKey, group);
            } else if (!group.schemaName && schemaName) {
                group.tag = tag;
                group.schemaName = schemaName;
                group.schema = schemas[schemaName];
            }
            group.methods.push(buildMethod(http, pathStr, op, tag, schemaName));
        }
    }

    for (const group of groups.values()) {
        applyVersionSuffixes(group.methods);
        dedupeMethodNames(group.methods);
    }
    return [...groups.values()];
}

/**
 * Directory of curated resource overrides. A handful of resources
 * (`campaigns`, `connections`, `customFields`, `persons`, `sectors`,
 * `workspaces`) were enriched by hand with information the source spec simply
 * does not carry — entity-typed returns / `Partial<Entity>` bodies where the
 * spec's response is an opaque `object`, fully-typed query-param shapes the spec
 * documents only as `filters`, the `WorkspaceUser` entity the API returns but
 * exposes no schema for, and a few renamed / hand-added methods with curated
 * prose. None of this is derivable from `openapi.json`, so the emit reproduces
 * these files verbatim from here instead of generating (and, as a bonus, will
 * never clobber a curated resource on a future regen). A file present here wins
 * over generation for its `gen_<fileKey>.ts`.
 */
// Anchored at the SOURCE tree (not `dist/`): the overrides are `.ts` templates
// read verbatim, and are never compiled. `emit.js` runs from `dist/generator/
// stages` and this module from `src/generator/stages` — both are three levels
// below the repo root, so the same `../../../src/...` walk resolves either way.
export const RESOURCE_OVERRIDE_DIR = path.resolve(__dirname, '..', '..', '..', 'src', 'generator', 'overrides', 'resources');

/** Read a curated override file for a resource, or `undefined` if none exists. */
export function readResourceOverride(fileKey: string, dir: string = RESOURCE_OVERRIDE_DIR): string | undefined {
    const filePath = path.join(dir, `gen_${fileKey}.ts`);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : undefined;
}

/**
 * Emit every resource file for a spec into `outDir`, one `gen_<file>.ts` per
 * resource. A resource with a curated override (see {@link RESOURCE_OVERRIDE_DIR})
 * is copied verbatim; all others are generated. Returns a summary for
 * logging/assertions.
 * @param spec The resolved OpenAPI spec.
 * @param outDir Destination directory (created if missing).
 */
export function emitAll(spec: OpenApiSpec, outDir: string): { files: number; methods: number; overridden: number; sheetMultipart: boolean } {
    fs.mkdirSync(outDir, { recursive: true });
    const groups = groupResources(spec);
    let methods = 0;
    let sheetMultipart = false;
    for (const group of groups) {
        const fileKey = camelCase(group.tag);
        if (group.methods.some((m) => m.name === 'sheet' && m.multipart)) sheetMultipart = true;
        // A curated resource is materialized verbatim by the pass below; do not
        // generate over it here.
        if (readResourceOverride(fileKey)) continue;
        fs.writeFileSync(path.join(outDir, `gen_${fileKey}.ts`), emitResourceFile(group));
        methods += group.methods.length;
    }

    // Curated resources always land verbatim — even when upstream tag drift
    // (renamed/regrouped tags) leaves one with no matching operation group this
    // run, so the SDK never silently loses a hand-enriched resource.
    let overridden = 0;
    if (fs.existsSync(RESOURCE_OVERRIDE_DIR)) {
        for (const file of fs.readdirSync(RESOURCE_OVERRIDE_DIR)) {
            if (!file.endsWith('.ts')) continue;
            fs.writeFileSync(path.join(outDir, file), fs.readFileSync(path.join(RESOURCE_OVERRIDE_DIR, file), 'utf8'));
            overridden++;
        }
    }

    return { files: groups.length, methods, overridden, sheetMultipart };
}

/** CLI entry: read the resolved spec and emit resources into a staging dir. */
function main(): void {
    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const specPath = path.resolve(repoRoot, 'src', 'generator', 'openapi.json');
    const outDir = path.resolve(repoRoot, 'src', 'generator', '_staging');
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')) as OpenApiSpec;
    const result = emitAll(spec, outDir);
    console.log('[emit] DONE');
    console.log(`  files          : ${result.files}`);
    console.log(`  methods        : ${result.methods}`);
    console.log(`  overridden     : ${result.overridden} (curated resources reproduced verbatim)`);
    console.log(`  campaigns/sheet: ${result.sheetMultipart ? 'multipart OK' : 'NOT multipart'}`);
}

if (require.main === module) main();
