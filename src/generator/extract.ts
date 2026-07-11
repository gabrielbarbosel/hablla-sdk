/**
 * Generator stage: EXTRACT.
 *
 * Builds the base OpenAPI spec that later stages (overrides, emit) consume.
 * The spec is reconstructed BUNDLE-FIRST, from two live sources:
 *
 *   1. Studio bundle (studio.hablla.com) — the web app's own API layer, walked
 *      with a LIVE AST pass. This is the AUTHORITATIVE source for routes, method
 *      names and multipart bodies. The bundle is minified but the API functions
 *      survive as module-level `const NameApi = ({ a: X, b: Y }) => api.verb(
 *      `url-template`, arg)` declarations whose NAMES are legible. For each such
 *      declaration {@link extractBundleFunctions} recovers:
 *        - the REAL function name  (-> `x-bundle-fn`, and `x-sdk-method`);
 *        - the HTTP verb           (get/post/put/patch/delete, resolving the
 *                                    `createWithFile`/`updateWithFile`/`update`/
 *                                    `getWithConfig`/`postAgent` aliases);
 *        - the URL, with each `${alias}` resolved back to the destructured key
 *          (`workspace: Rn` ⇒ `Rn` ⇒ `workspace`);
 *        - whether the verb is a `*WithFile` variant ⇒ multipart/form-data.
 *      {@link buildStudioSpec} turns those into an OpenAPI document.
 *
 *   2. Official swagger (`api.hablla.com/v1/docs/swagger-ui-init.js`) — fetched
 *      LIVE and used only to ENRICH: it fills operations the bundle lacks and
 *      backfills human summaries. It carries no component schemas of its own, so
 *      it never contributes types; that is what the bundle entity schemas are
 *      for (see {@link loadEntitySchemas}).
 *
 * The merge ({@link mergeSpecs}) is bundle-first: the bundle spec wins on path
 * strings, tags and bodies; swagger only augments.
 */

import * as https from 'https';

import { parse } from '@babel/parser';

/** HTTP methods the generator recognises on an OpenAPI operation. */
export const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

/** Loose OpenAPI operation shape — the generator only reads a few fields. */
export interface OpenApiOperation {
    operationId?: string;
    tags?: string[];
    summary?: string;
    parameters?: unknown[];
    requestBody?: unknown;
    responses?: Record<string, unknown>;
    [key: string]: unknown;
}

/** A path item: a map of HTTP method -> operation (plus incidental keys). */
export type OpenApiPathItem = Partial<Record<HttpMethod, OpenApiOperation>> & {
    [key: string]: unknown;
};

/** Loose OpenAPI 3.0 document — intentionally permissive. */
export interface OpenApiSpec {
    openapi: string;
    info: Record<string, unknown>;
    servers?: unknown[];
    paths: Record<string, OpenApiPathItem>;
    components?: { schemas?: Record<string, unknown>; [key: string]: unknown };
    tags?: unknown[];
    [key: string]: unknown;
}

/** Live URL of the swagger-ui bootstrap script that embeds the OpenAPI doc. */
export const SWAGGER_UI_INIT_URL = 'https://api.hablla.com/v1/docs/swagger-ui-init.js';

/** Live URL of the studio SPA index (entry point for the bundle extraction). */
export const STUDIO_INDEX_URL = 'https://studio.hablla.com/';

/**
 * GET a URL and resolve with its body as text. Rejects on transport error or
 * timeout; never on HTTP status (the caller decides what a non-200 means).
 * @param url Absolute http(s) URL.
 * @param timeoutMs Socket timeout before the request is aborted.
 * @returns The response body and status.
 */
export function fetchText(url: string, timeoutMs = 30000): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'user-agent': 'hablla-sdk-generator' } }, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
        });
        req.on('error', reject);
        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error(`request timeout after ${timeoutMs}ms: ${url}`));
        });
    });
}

/**
 * Extract the embedded `swaggerDoc` object from a swagger-ui-init.js body.
 * The script assigns `{ "swaggerDoc": { ... }, "customOptions": { ... } }`;
 * the doc is sliced between those two markers and JSON-parsed.
 * @param scriptBody Raw JavaScript source of swagger-ui-init.js.
 * @returns The parsed OpenAPI document.
 */
export function parseSwaggerDoc(scriptBody: string): OpenApiSpec {
    const tight = scriptBody.match(/"swaggerDoc":\s*(\{[\s\S]*?\})\s*,\s*"customOptions"/);
    if (tight && tight[1]) {
        try {
            return JSON.parse(tight[1]) as OpenApiSpec;
        } catch {
            // fall through to the marker-slice below
        }
    }
    const startIdx = scriptBody.indexOf('"swaggerDoc":');
    const endIdx = scriptBody.lastIndexOf('"customOptions"');
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        throw new Error('could not locate swaggerDoc in swagger-ui-init.js');
    }
    const raw = scriptBody
        .slice(startIdx + '"swaggerDoc":'.length, endIdx)
        .trim()
        .replace(/,\s*$/, '');
    return JSON.parse(raw) as OpenApiSpec;
}

/**
 * Fetch and parse the LIVE official swagger document.
 * @param url Override the default {@link SWAGGER_UI_INIT_URL}.
 * @returns The parsed OpenAPI document.
 * @throws If the endpoint is unreachable, returns non-200, or the doc cannot be
 *   located/parsed. Callers that want resilience should catch and fall back.
 */
export async function fetchSwaggerDoc(url = SWAGGER_UI_INIT_URL): Promise<OpenApiSpec> {
    const { status, body } = await fetchText(url);
    if (status !== 200) throw new Error(`swagger fetch failed: HTTP ${status} for ${url}`);
    return parseSwaggerDoc(body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Live studio bundle: fetch → AST walk → OpenAPI.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Locate the studio's main JS chunk URL from the SPA index HTML. Vite emits a
 * single `/assets/index-<hash>.js` entry chunk; that is the bundle we walk.
 * @param indexHtml Raw HTML of the studio index page.
 * @param origin Origin to resolve a relative `src` against.
 * @returns The absolute bundle URL.
 * @throws If no `index-*.js` chunk is referenced by the page.
 */
export function discoverBundleUrl(indexHtml: string, origin = new URL(STUDIO_INDEX_URL).origin): string {
    for (const match of indexHtml.matchAll(/(?:src|href)=["']([^"']*\/assets\/index-[^"']*\.js)["']/g)) {
        const src = match[1];
        if (src) return src.startsWith('http') ? src : new URL(src, origin).href;
    }
    // Fallback: any script src that looks like an index chunk.
    for (const match of indexHtml.matchAll(/<script[^>]+src=["']([^"']+index[^"']*\.js)["']/g)) {
        const src = match[1];
        if (src) return src.startsWith('http') ? src : new URL(src, origin).href;
    }
    throw new Error('could not locate an /assets/index-*.js chunk in the studio index');
}

/**
 * Fetch the studio SPA index, discover the entry chunk, and download it.
 * @param indexUrl Override the default {@link STUDIO_INDEX_URL}.
 * @returns The bundle's absolute URL and its full source text (~21MB minified).
 */
export async function fetchStudioBundle(indexUrl = STUDIO_INDEX_URL): Promise<{ url: string; code: string }> {
    const index = await fetchText(indexUrl);
    if (index.status !== 200) throw new Error(`studio index fetch failed: HTTP ${index.status} for ${indexUrl}`);
    const bundleUrl = discoverBundleUrl(index.body, new URL(indexUrl).origin);
    const bundle = await fetchText(bundleUrl, 120000);
    if (bundle.status !== 200) throw new Error(`studio bundle fetch failed: HTTP ${bundle.status} for ${bundleUrl}`);
    return { url: bundleUrl, code: bundle.body };
}

/** Minimal Babel AST node view — the walker only reads `type` and children. */
interface AstNode {
    type: string;
    [key: string]: unknown;
}

/** Keys that never hold child nodes; skipping them keeps the walk fast. */
const NON_CHILD_KEYS = new Set([
    'loc', 'start', 'end', 'range', 'comments', 'tokens', 'extra',
    'leadingComments', 'trailingComments', 'innerComments',
]);

/**
 * Map an `apiClient` method name to the HTTP verb it performs. The web app wraps
 * several verbs behind helper names: `getWithConfig` is a GET with a config
 * object, `createWithFile`/`updateWithFile` are multipart POST/PUT, `update` is
 * a plain PUT, and `postAgent` posts to the agent host.
 */
const METHOD_MAP: Record<string, HttpMethod> = {
    get: 'get',
    getWithConfig: 'get',
    post: 'post',
    postAgent: 'post',
    createWithFile: 'post',
    put: 'put',
    update: 'put',
    updateWithFile: 'put',
    patch: 'patch',
    delete: 'delete',
};

/** The `apiClient` method names that upload a file as multipart/form-data. */
const MULTIPART_METHODS = new Set(['createWithFile', 'updateWithFile']);

/** snake_case a camel/kebab/space identifier: `productsPricesId` -> `products_prices_id`. */
function toSnakeCase(input: string): string {
    return input
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[-\s]+/g, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
}

/** Naive English singularizer for a snake-cased collection noun. */
function singularWord(word: string): string {
    if (/ies$/.test(word)) return word.replace(/ies$/, 'y');
    if (/(ches|shes|xes|zes|sses)$/.test(word)) return word.replace(/es$/, '');
    if (/ss$/.test(word)) return word;
    if (/s$/.test(word)) return word.replace(/s$/, '');
    return word;
}

/**
 * The nearest preceding STATIC (non-interpolation) segment of a URL template
 * before the numbered hole `{index}`. In `v1/workspaces/{0}/campaigns/{1}` the
 * segment before hole `1` is `campaigns`. Interpolation holes (`{0}`, `{1}`) are
 * skipped so consecutive parameters resolve to the last real collection noun.
 */
function precedingStaticSegment(urlText: string, index: number): string {
    const marker = `{${index}}`;
    const at = urlText.indexOf(marker);
    if (at === -1) return '';
    const segments = urlText
        .slice(0, at)
        .split('/')
        .filter((s) => s && !/^\{\d+\}$/.test(s));
    return segments[segments.length - 1] ?? '';
}

/** One request-issuing function recovered from the bundle. */
export interface BundleFunction {
    /** The real, legible function name (e.g. `createSheetCampaignApi`). */
    name: string;
    /** Resolved HTTP verb. */
    method: HttpMethod;
    /** The raw apiClient method (e.g. `createWithFile`), before resolution. */
    rawMethod: string;
    /** The apiClient instance the call was made on (best-effort; informational). */
    instance: string;
    /** URL with each interpolation resolved to its destructured key: `.../{workspace}/...`. */
    path: string;
    /** Distinct path-parameter names, in order of first appearance. */
    pathParams: string[];
    /** The destructured key sent as the request body, if any (POST/PUT/PATCH). */
    body: string | null;
    /** Destructured keys that are neither path params nor the body → query keys. */
    queryKeys: string[];
    /** True when the raw method is a `*WithFile` upload (multipart/form-data). */
    multipart: boolean;
}

/**
 * Build the alias map for a function's first (destructuring) parameter.
 * `({ workspace: Rn, board: fn })` yields `{ Rn: 'workspace', fn: 'board' }`,
 * plus the list of real keys and the rest-element name if present.
 */
function aliasMap(param: AstNode | undefined): { map: Record<string, string>; keys: string[]; rest: string | null } {
    const map: Record<string, string> = {};
    const keys: string[] = [];
    let rest: string | null = null;
    if (param && param.type === 'ObjectPattern') {
        for (const prop of (param.properties as AstNode[]) ?? []) {
            if (prop.type === 'ObjectProperty' && prop.key) {
                const keyNode = prop.key as AstNode;
                const key =
                    keyNode.type === 'Identifier'
                        ? (keyNode.name as string)
                        : keyNode.type === 'StringLiteral'
                          ? (keyNode.value as string)
                          : null;
                if (!key) continue;
                keys.push(key);
                let value = prop.value as AstNode | undefined;
                if (value && value.type === 'AssignmentPattern') value = value.left as AstNode;
                if (value && value.type === 'Identifier') map[value.name as string] = key;
                else map[key] = key;
            } else if (prop.type === 'RestElement' && (prop.argument as AstNode)?.type === 'Identifier') {
                rest = (prop.argument as AstNode).name as string;
            }
        }
    }
    return { map, keys, rest };
}

/**
 * Read a URL argument node into a template string with numbered holes and the
 * list of interpolation host names. `` `v1/workspaces/${Rn}/boards/${fn}` ``
 * becomes `{ text: 'v1/workspaces/{0}/boards/{1}', exprs: ['Rn', 'fn'] }`.
 */
function urlInfo(node: AstNode): { text: string; exprs: (string | null)[] } | null {
    if (node.type === 'StringLiteral') return { text: node.value as string, exprs: [] };
    if (node.type !== 'TemplateLiteral') return null;
    let text = '';
    const exprs: (string | null)[] = [];
    const quasis = node.quasis as AstNode[];
    const expressions = node.expressions as AstNode[];
    quasis.forEach((quasi, i) => {
        text += ((quasi.value as { cooked?: string }).cooked) ?? '';
        if (i < expressions.length) {
            const expr = expressions[i]!;
            let name: string | null = null;
            if (expr.type === 'Identifier') {
                name = expr.name as string;
            } else if (
                (expr.type === 'MemberExpression' || expr.type === 'OptionalMemberExpression') &&
                (expr.object as AstNode).type === 'Identifier'
            ) {
                name = (expr.object as AstNode).name as string;
            }
            exprs.push(name);
            text += `{${exprs.length - 1}}`;
        }
    });
    return { text, exprs };
}

/**
 * Find the first apiClient request call (`x.get(url, …)`, `x.createWithFile(
 * url, …)`, …) anywhere inside a function body. Returns the call node and its
 * parsed URL, or null when the function issues no request.
 */
function findRequestCall(node: unknown): { call: AstNode; url: { text: string; exprs: (string | null)[] } } | null {
    let found: { call: AstNode; url: { text: string; exprs: (string | null)[] } } | null = null;
    (function walk(current: unknown): void {
        if (found || !current || typeof current !== 'object') return;
        if (Array.isArray(current)) {
            for (const child of current) walk(child);
            return;
        }
        const n = current as AstNode;
        if (
            n.type === 'CallExpression' &&
            (n.callee as AstNode)?.type === 'MemberExpression' &&
            !(n.callee as AstNode).computed &&
            ((n.callee as AstNode).property as AstNode)?.type === 'Identifier' &&
            METHOD_MAP[((n.callee as AstNode).property as AstNode).name as string] &&
            (n.arguments as unknown[]).length
        ) {
            const url = urlInfo((n.arguments as AstNode[])[0]!);
            // Guard against `.get()` on unrelated objects: a real route argument
            // starts like a versioned path segment.
            if (url && /^\/?v?\d?\/?\w/.test(url.text)) {
                found = { call: n, url };
                return;
            }
        }
        for (const key in n) {
            if (NON_CHILD_KEYS.has(key)) continue;
            walk(n[key]);
        }
    })(node);
    return found;
}

/**
 * Walk a parsed bundle and recover every request-issuing function. This is the
 * live counterpart to the legacy `extract-functions.js`: a manual recursive
 * traversal (no `@babel/traverse` needed) that pairs each named arrow/function
 * declaration with the first apiClient call in its body and resolves the URL's
 * interpolations back to the destructured parameter keys.
 * @param code The bundle source (minified is fine — names are preserved).
 * @returns The recovered functions, deduplicated by `method + resolved path`.
 */
export function extractBundleFunctions(code: string): BundleFunction[] {
    const ast = parse(code, { sourceType: 'unambiguous', errorRecovery: true, plugins: ['jsx'] }) as unknown as AstNode;

    const out: BundleFunction[] = [];
    const program = (ast.program as AstNode).body;

    (function visit(node: unknown): void {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
            for (const child of node) visit(child);
            return;
        }
        const n = node as AstNode;

        let fn: AstNode | null = null;
        let fnName: string | null = null;
        if (
            n.type === 'VariableDeclarator' &&
            (n.id as AstNode)?.type === 'Identifier' &&
            n.init &&
            ((n.init as AstNode).type === 'ArrowFunctionExpression' || (n.init as AstNode).type === 'FunctionExpression')
        ) {
            fnName = (n.id as AstNode).name as string;
            fn = n.init as AstNode;
        }

        if (fn && fnName) {
            const hit = findRequestCall((fn.body as AstNode));
            if (hit) {
                const rawMethod = ((hit.call.callee as AstNode).property as AstNode).name as string;
                const method = METHOD_MAP[rawMethod]!;
                const calleeObject = (hit.call.callee as AstNode).object as AstNode;
                const instance =
                    calleeObject.type === 'Identifier'
                        ? (calleeObject.name as string)
                        : calleeObject.type === 'MemberExpression' && (calleeObject.property as AstNode)?.type === 'Identifier'
                          ? ((calleeObject.property as AstNode).name as string)
                          : '?';

                const params = fn.params as AstNode[];
                const { map, keys, rest } = aliasMap(params?.[0]);

                // Destructured keys consumed by URL interpolations — used only to
                // exclude them from the query keys (they are path params, not query).
                const pathParamKeys = hit.url.exprs
                    .map((local) => (local && map[local]) || local)
                    .filter(Boolean) as string[];

                // SPECIFIC path-parameter names, derived from the preceding static
                // path segment, NOT the destructured key. The bundle almost always
                // destructures the primary id as the generic `id` (`{workspace:Rn,
                // id:fn}`), so the collection noun carries the specificity:
                // `.../campaigns/${fn}` -> `campaign_id`, `.../workspaces/${Rn}` ->
                // `workspace_id`. Consecutive holes under one noun are disambiguated
                // with an occurrence counter (`.../data/${t}/${id}` -> `data_id`,
                // `data2_id`), reproducing the hand-verified SDK's naming.
                const usedBase = new Map<string, number>();
                const pathParamNames = hit.url.exprs.map((_local, i) => {
                    const base = singularWord(toSnakeCase(precedingStaticSegment(hit.url.text, i))) || 'item';
                    const n = (usedBase.get(base) ?? 0) + 1;
                    usedBase.set(base, n);
                    return n > 1 ? `${base}${n}_id` : `${base}_id`;
                });
                let realPath = hit.url.text;
                pathParamNames.forEach((name, i) => {
                    realPath = realPath.replace(`{${i}}`, `{${name}}`);
                });

                const args = hit.call.arguments as AstNode[];
                let body: string | null = null;
                if ((method === 'post' || method === 'put' || method === 'patch') && args[1]) {
                    const arg = args[1];
                    body =
                        arg.type === 'Identifier'
                            ? map[arg.name as string] || (arg.name as string)
                            : arg.type === 'ObjectExpression'
                              ? '(inline)'
                              : rest || 'data';
                }
                const queryKeys = keys.filter((k) => !pathParamKeys.includes(k) && k !== body && k !== 'workspace');

                out.push({
                    name: fnName,
                    method,
                    rawMethod,
                    instance,
                    path: realPath,
                    pathParams: pathParamNames.filter((n) => n !== 'workspace_id'),
                    body,
                    queryKeys,
                    multipart: MULTIPART_METHODS.has(rawMethod),
                });
            }
        }

        for (const key in n) {
            if (NON_CHILD_KEYS.has(key)) continue;
            visit(n[key]);
        }
    })(program);

    return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAPI construction from the recovered functions.
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical key for an operation: method + path with params/versions blurred. */
export function canonKey(method: string, path: string): string {
    const canonPath = ('/' + path.replace(/^\//, ''))
        .split('?')[0]!
        .replace(/\{[^}]+\}/g, '{}')
        .replace(/\/+$/, '')
        .toLowerCase();
    return `${method} ${canonPath}`;
}

/**
 * Whether a path is a real, version-prefixed Hablla API route. Guards against
 * bundle false positives (`.get()` on non-API objects, absolute webhook URLs)
 * and swagger junk paths; `/vc\d/` segments are minifier artifacts, not versions.
 * @param path A spec path string.
 */
export function isApiPath(path: string): boolean {
    return /^\/v\d+\//.test(path) && !path.split('/').some((s) => /^vc\d+$/.test(s));
}

/**
 * Normalize a bundle path to the spec convention: leading slash,
 * `{workspace}`->`{workspace_id}`, `{data}`->`{id}` (a destructuring artifact
 * when the URL interpolates `data?.id`), and no query string.
 * @param path A bundle-resolved path (may lack a leading slash).
 */
export function normPath(path: string): string {
    let out = '/' + path.replace(/^\//, '').split('?')[0];
    out = out.replace(/\{workspace\}/g, '{workspace_id}').replace(/\{data\}/g, '{id}');
    return out.replace(/\/+$/, '');
}

/**
 * Fallback tag for a path: the first static, non-version, non-`workspaces`
 * segment. Matches the `x-tag` the bundle entity schemas carry, so emit can
 * link an operation's resource to its entity interface.
 * @param path A spec path string.
 */
export function tagOf(path: string): string {
    const seg = path
        .split('/')
        .filter((s) => s && !s.startsWith('{') && !/^v\w*\d+$/.test(s) && s !== 'workspaces');
    return seg[0] || 'root';
}

/**
 * Derive the SDK-facing method name from a bundle function name: drop the
 * conventional `Api` suffix and any minifier `$N` disambiguator. This is the
 * collision-free key the task annotates as `x-sdk-method`
 * (`createSheetCampaignApi` -> `createSheetCampaign`).
 * @param fnName The real bundle function name.
 */
export function deriveSdkMethod(fnName: string): string {
    return fnName.replace(/\$\d+$/, '').replace(/Api\d*$/, '');
}

const GENERIC_OBJECT = { type: 'object', additionalProperties: true } as const;

/** A minimal multipart/form-data body carrying a single binary `file` part. */
function multipartBody(): unknown {
    return {
        required: true,
        content: {
            'multipart/form-data': {
                schema: {
                    type: 'object',
                    required: ['file'],
                    properties: { file: { type: 'string', format: 'binary' } },
                    additionalProperties: true,
                },
            },
        },
        'x-source': 'bundle',
    };
}

/** `$ref` to a component schema by name. */
function entityRef(name: string): { $ref: string } {
    return { $ref: `#/components/schemas/${name}` };
}

/** Wrap a schema as a JSON response/request content map. */
function jsonContent(schema: unknown): Record<string, unknown> {
    return { 'application/json': { schema } };
}

/**
 * Synthesize a standard success response for an operation, referencing the tag's
 * entity schema when one is known (list GETs return `{ results: [Entity] }`).
 */
function successResponse(method: HttpMethod, path: string, entity: string | undefined): Record<string, unknown> {
    if (method === 'delete') return { 204: { description: 'No Content' } };
    if (method === 'post') {
        return { 201: { description: 'Created', content: jsonContent(entity ? entityRef(entity) : GENERIC_OBJECT) } };
    }
    const isCollection = method === 'get' && !/\}$/.test(path);
    if (isCollection) {
        const schema = entity
            ? { type: 'object', properties: { results: { type: 'array', items: entityRef(entity) } }, additionalProperties: true }
            : GENERIC_OBJECT;
        return { 200: { description: 'OK', content: jsonContent(schema) } };
    }
    return { 200: { description: 'OK', content: jsonContent(entity ? entityRef(entity) : GENERIC_OBJECT) } };
}

/**
 * Synthesize a schema-LESS success response (status + description only). Bundle
 * operations get this shape at build time; the entity type is derived later by
 * {@link applyEntityResponses}, AFTER {@link retagOperations} has settled the
 * final resource tag. Deferring it this way means a nested collection
 * (`.../boards/{id}/lists`) is typed against its OWN entity (or left `unknown`
 * when it has none), never its parent's.
 */
function bareSuccess(method: HttpMethod): Record<string, unknown> {
    if (method === 'delete') return { 204: { description: 'No Content' } };
    if (method === 'post') return { 201: { description: 'Created' } };
    return { 200: { description: 'OK' } };
}

/** One error response referencing the shared ApiError schema. */
function errorResponse(description: string): Record<string, unknown> {
    return { description, content: jsonContent(entityRef('ApiError')) };
}

/**
 * Add standard HTTP error responses without overriding codes already present.
 * @param responses The operation responses object (mutated).
 * @param method Lowercase HTTP method.
 * @param path Normalized path of the operation.
 */
function addStandardErrors(responses: Record<string, unknown>, method: HttpMethod, path: string): void {
    const errors: Record<string, string> = {
        400: 'Bad request (validation failed)',
        401: 'Unauthorized (missing or invalid token)',
        403: 'Forbidden (insufficient permissions)',
        500: 'Internal server error',
    };
    const params = (path.match(/\{([^}]+)\}/g) || []).map((s) => s.slice(1, -1));
    if (params.some((x) => x !== 'workspace_id')) errors[404] = 'Resource not found';
    if (['post', 'put', 'patch'].includes(method)) errors[409] = 'Conflict (duplicate or concurrent modification)';
    for (const [code, description] of Object.entries(errors)) {
        if (!responses[code]) responses[code] = errorResponse(description);
    }
}

/** Options for {@link buildStudioSpec}. */
export interface BuildStudioSpecOptions {
    /**
     * Bundle entity component schemas (name -> JSON schema), each ideally
     * carrying `x-tag`. Live swagger provides none, so these supply the SDK's
     * response types; they are DATA-SHAPE metadata only and never drive routes.
     */
    entitySchemas?: Record<string, unknown>;
}

/**
 * Build the authoritative OpenAPI document from the recovered bundle functions.
 * Every operation is annotated with `x-bundle-fn` (real name), `x-sdk-method`
 * (derived name) and, for uploads, `x-multipart` + a multipart/form-data body.
 * @param functions Output of {@link extractBundleFunctions}.
 * @param options See {@link BuildStudioSpecOptions}.
 * @returns A fresh OpenAPI 3.0 document.
 */
export function buildStudioSpec(functions: BundleFunction[], options: BuildStudioSpecOptions = {}): OpenApiSpec {
    const entitySchemas = options.entitySchemas ?? {};

    const spec: OpenApiSpec = {
        openapi: '3.0.3',
        info: {
            title: 'Hablla API',
            version: '1.0.0',
            description:
                'Reconstructed live from the studio web-app bundle (AST-extracted, authoritative) and enriched with the official swagger as a secondary source.',
            'x-sources': ['studio-bundle', 'swagger-official'],
        },
        servers: [{ url: 'https://api.hablla.com' }],
        paths: {},
        components: { schemas: { ...entitySchemas } },
    };
    spec.components!.schemas!.ApiError = {
        type: 'object',
        properties: { errorCode: { type: 'integer' }, message: { type: 'string' } },
        required: ['message'],
    };

    const seen = new Set<string>();
    let multipartOps = 0;
    for (const fn of functions) {
        const path = normPath(fn.path);
        if (!isApiPath(path)) continue;
        const key = canonKey(fn.method, path);
        if (seen.has(key)) continue;
        seen.add(key);

        const tag = tagOf(path);

        const parameters: unknown[] = [];
        for (const name of [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]!)) {
            parameters.push({ name, in: 'path', required: true, schema: { type: 'string' } });
        }
        for (const name of fn.queryKeys) {
            parameters.push({ name, in: 'query', required: false, schema: { type: 'string' }, 'x-source': 'bundle' });
        }

        const op: OpenApiOperation = {
            operationId: fn.name,
            tags: [tag],
            parameters,
            'x-source': 'bundle',
            'x-bundle-fn': fn.name,
            'x-sdk-method': deriveSdkMethod(fn.name),
        };

        if (fn.multipart) {
            op.requestBody = multipartBody();
            op['x-multipart'] = true;
            multipartOps++;
        } else if (fn.body) {
            op.requestBody = { required: true, content: jsonContent(GENERIC_OBJECT), 'x-source': 'generic' };
        }

        const responses = bareSuccess(fn.method);
        addStandardErrors(responses, fn.method, path);
        op.responses = responses;

        spec.paths[path] = spec.paths[path] || {};
        spec.paths[path]![fn.method] = op;
    }

    spec.info['x-bundle-stats'] = {
        functionsRecovered: functions.length,
        operations: seen.size,
        multipartOperations: multipartOps,
    };
    return spec;
}

/**
 * Load bundle entity component schemas from a previously bundle-derived spec.
 * These are DATA-SHAPE metadata only — routes, names and multipart flags all
 * come from the live AST — but the live swagger carries no schemas, so this is
 * the sole source of the SDK's typed entity interfaces and `Paged<T>` returns.
 * Requires `fs`, imported lazily to keep the module usable in non-Node contexts.
 * @param filePath Absolute path to a spec whose `components.schemas` hold the entities.
 * @returns The `components.schemas` map, or `{}` when the file is absent.
 */
export function loadEntitySchemas(filePath: string): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    if (!fs.existsSync(filePath)) return {};
    const spec = JSON.parse(fs.readFileSync(filePath, 'utf8')) as OpenApiSpec;
    return (spec.components?.schemas ?? {}) as Record<string, unknown>;
}

/**
 * Merge two OpenAPI specs, bundle-first. The bundle spec is copied wholesale
 * (authoritative on path strings, tags and bodies); the swagger spec then adds
 * only operations the bundle lacks, and backfills summaries where the bundle
 * operation has none.
 * @param studioSpec Authoritative bundle-derived spec (primary).
 * @param swaggerDoc Live official swagger (secondary).
 * @returns A new merged spec; inputs are not mutated.
 */
export function mergeSpecs(studioSpec: OpenApiSpec, swaggerDoc: OpenApiSpec): OpenApiSpec {
    const merged: OpenApiSpec = JSON.parse(JSON.stringify(studioSpec));
    merged.paths = merged.paths || {};

    const studioKeys = new Set<string>();
    const studioOpByKey = new Map<string, OpenApiOperation>();
    for (const [path, item] of Object.entries(merged.paths)) {
        for (const method of HTTP_METHODS) {
            const op = item[method];
            if (!op) continue;
            const key = canonKey(method, path);
            studioKeys.add(key);
            studioOpByKey.set(key, op);
        }
    }

    let swaggerAdded = 0;
    let summariesBackfilled = 0;
    const swaggerPaths = swaggerDoc.paths || {};
    for (const [path, item] of Object.entries(swaggerPaths)) {
        for (const method of HTTP_METHODS) {
            const swOp = (item as OpenApiPathItem)[method];
            if (!swOp) continue;
            if (!isApiPath(path)) continue;
            const key = canonKey(method, path);
            if (studioKeys.has(key)) {
                const studioOp = studioOpByKey.get(key)!;
                if (!studioOp.summary && swOp.summary) {
                    studioOp.summary = swOp.summary;
                    summariesBackfilled++;
                }
                // Enrich the bundle operation with the swagger's DOCUMENTED query
                // parameters. The bundle only reveals the single destructured query
                // key (usually `filters`); swagger carries the full documented set
                // (`page`, `limit`, `order`, ...). Union them — bundle keys first,
                // then swagger's, skipping any already present — so the emitted
                // `opts.query` shape is fully typed instead of `filters`-only.
                const studioParams = (studioOp.parameters ?? []) as Array<{ name?: string; in?: string }>;
                const present = new Set(studioParams.map((p) => p.name));
                for (const sp of (swOp.parameters ?? []) as Array<{ name?: string; in?: string }>) {
                    if (sp.in === 'query' && sp.name && !present.has(sp.name)) {
                        studioParams.push(sp);
                        present.add(sp.name);
                    }
                }
                studioOp.parameters = studioParams;
                continue;
            }
            const copy: OpenApiOperation = JSON.parse(JSON.stringify(swOp));
            copy.tags = copy.tags && copy.tags.length ? copy.tags : [tagOf(path)];
            copy['x-source'] = 'swagger';
            merged.paths[path] = merged.paths[path] || {};
            if (!merged.paths[path]![method]) {
                merged.paths[path]![method] = copy;
                studioKeys.add(key);
                swaggerAdded++;
            }
        }
    }

    merged.components = merged.components || {};
    merged.components.schemas = {
        ...(swaggerDoc.components?.schemas || {}),
        ...(merged.components.schemas || {}),
    };

    merged.info = {
        ...merged.info,
        'x-generator': 'hablla-sdk generator / extract stage',
        'x-extracted-at': new Date().toISOString(),
        'x-merge-stats': {
            studioOperations: studioOpByKey.size,
            swaggerOnlyAdded: swaggerAdded,
            summariesBackfilled,
        },
    };
    return merged;
}

/** True when an operation already declares a JSON schema on its 200/201 success. */
function hasJsonSuccessSchema(op: OpenApiOperation): boolean {
    const responses = op.responses ?? {};
    for (const code of ['200', '201']) {
        const content = (responses[code] as { content?: Record<string, { schema?: unknown }> } | undefined)?.content;
        if (content?.['application/json']?.schema) return true;
    }
    return false;
}

/**
 * Derive typed success responses for operations that lack one. Bundle operations
 * are built with an entity-referencing response already; swagger-only operations
 * arrive with a bare `{ description: '' }` and no schema, so they would emit
 * `Promise<unknown>`. This backfills the SAME entity-derived response the bundle
 * operations get — `Entity` for an item, `{ results: [Entity] }` for a
 * collection, `204` for a delete — keyed by the operation's tag entity. Tags
 * that have no component schema are left untouched (their `unknown` is genuine,
 * matching the SDK). Purely a TYPE derivation from the bundle entity schemas; it
 * never invents a schema for a tag the bundle does not describe.
 * @param spec The merged spec (mutated in place).
 * @returns The count of operations whose success response was derived.
 */
export function applyEntityResponses(spec: OpenApiSpec): number {
    const schemas = (spec.components?.schemas ?? {}) as Record<string, { 'x-tag'?: string }>;
    // Key the entity index by a CASE-INSENSITIVE, separator-free tag so a
    // hyphenated route tag (`custom-fields`) matches a camelCased entity `x-tag`
    // (`customFields`) — the same normalization the emit uses to group files.
    const tagKey = (s: string): string => s.replace(/[-_\s]+/g, '').toLowerCase();
    const entityByTag: Record<string, string> = {};
    for (const [name, schema] of Object.entries(schemas)) {
        const tag = schema['x-tag'];
        if (tag && !entityByTag[tagKey(tag)]) entityByTag[tagKey(tag)] = name;
    }

    let typed = 0;
    for (const [path, item] of Object.entries(spec.paths)) {
        for (const method of HTTP_METHODS) {
            const op = item[method];
            if (!op || hasJsonSuccessSchema(op)) continue;
            const tag = op.tags?.[0] as string | undefined;
            const entity = tag ? entityByTag[tagKey(tag)] : undefined;
            if (!entity) continue;

            const responses: Record<string, unknown> = { ...(op.responses ?? {}) };
            for (const code of Object.keys(responses)) {
                if (/^2\d\d$/.test(code)) delete responses[code];
            }
            Object.assign(responses, successResponse(method, path, entity));
            addStandardErrors(responses, method, path);
            op.responses = responses;
            typed++;
        }
    }
    return typed;
}

/**
 * Guarantee every operation carries an `x-sdk-method`. Bundle operations already
 * have one (from their real function name); swagger-only operations get one
 * derived from their `operationId` or synthesized from `method + path`.
 * @param spec The (merged) spec, mutated in place.
 * @returns The count of operations that were missing an `x-sdk-method`.
 */
export function ensureSdkMethods(spec: OpenApiSpec): number {
    let filled = 0;
    for (const [path, item] of Object.entries(spec.paths)) {
        for (const method of HTTP_METHODS) {
            const op = item[method];
            if (!op || op['x-sdk-method']) continue;
            const fromId = op.operationId ? deriveSdkMethod(op.operationId) : '';
            if (fromId) {
                op['x-sdk-method'] = fromId;
            } else {
                const leaf = path.split('/').filter((s) => s && !s.startsWith('{')).pop() ?? 'root';
                op['x-sdk-method'] = `${method}_${leaf}`.replace(/[^A-Za-z0-9_]/g, '_');
            }
            filled++;
        }
    }
    return filled;
}

/** Count the operations (method entries) across a spec's paths. */
export function countOperations(spec: OpenApiSpec): number {
    let total = 0;
    for (const item of Object.values(spec.paths)) {
        for (const method of HTTP_METHODS) if (item[method]) total++;
    }
    return total;
}
