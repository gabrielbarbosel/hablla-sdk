/**
 * Generator stage: OVERRIDES.
 *
 * The extracted spec is imperfect — the studio bundle and the official swagger
 * both describe some operations wrongly or incompletely. This layer is a
 * hand-maintained set of corrections applied AFTER extraction and BEFORE emit.
 *
 * Each entry targets one operation (path + method) and either replaces its
 * `requestBody` / other fields declaratively, or runs a `patch` escape hatch.
 * Adding a correction = appending one {@link OperationOverride} to
 * {@link OVERRIDES}. Keep entries small and well-commented: every override is a
 * deliberate divergence from the upstream spec and must justify itself.
 */

import type { HttpMethod, OpenApiOperation, OpenApiSpec } from './extract';
import { HTTP_METHODS } from './extract';

/**
 * One correction targeting a single operation. `path` and `method` must match a
 * path string / method already present in the extracted spec (overrides correct
 * existing operations; they do not invent routes). Provide any subset of the
 * declarative fields and/or a `patch` for anything the declarative form cannot
 * express. Declarative fields are applied first, then `patch`.
 */
export interface OperationOverride {
    /** Exact spec path string, e.g. `/v2/workspaces/{workspace_id}/campaigns/sheet`. */
    path: string;
    /** HTTP method of the operation to correct. */
    method: HttpMethod;
    /** Why this override exists — surfaced in logs and code review. */
    reason: string;
    /** Replacement `requestBody` (whole-value replace). */
    requestBody?: unknown;
    /** Replacement `responses` (whole-value replace). */
    responses?: Record<string, unknown>;
    /** Additional operation fields to shallow-merge (e.g. `summary`). */
    set?: Partial<OpenApiOperation>;
    /** Escape hatch for corrections the declarative fields cannot express. */
    patch?: (op: OpenApiOperation) => void;
}

/**
 * Build a multipart/form-data request body with a single required binary file
 * part plus optional text fields. Text fields are always `type: string`,
 * matching how multipart form parts arrive on the wire.
 * @param fileField Name of the binary part (the form field name).
 * @param fileDescription Human description of the file part.
 * @param textFields Names of the accompanying text fields.
 */
export function multipartFileBody(
    fileField: string,
    fileDescription: string,
    textFields: string[],
): unknown {
    const properties: Record<string, unknown> = {
        [fileField]: { type: 'string', format: 'binary', description: fileDescription },
    };
    for (const name of textFields) properties[name] = { type: 'string' };
    return {
        required: true,
        content: {
            'multipart/form-data': {
                schema: {
                    type: 'object',
                    required: [fileField],
                    properties,
                },
            },
        },
        'x-source': 'override',
    };
}

/**
 * The hand-maintained corrections. Ordered by resource for readability; order
 * does not affect application (each targets a distinct operation).
 */
export const OVERRIDES: OperationOverride[] = [
    {
        // Upstream (bundle + swagger) describe this as application/json, but the
        // endpoint actually consumes an xlsx spreadsheet as multipart/form-data
        // under the `file` part, alongside text fields that configure the
        // dispatch. The emit stage turns a multipart body into the
        // `sheet(file, fields?, opts?)` signature seen in gen_campaigns.ts.
        path: '/v2/workspaces/{workspace_id}/campaigns/sheet',
        method: 'post',
        reason: 'Real content type is multipart/form-data (xlsx upload), not application/json.',
        set: {
            summary: 'Uploads an xlsx spreadsheet as multipart/form-data to create a campaign.',
        },
        requestBody: multipartFileBody(
            'file',
            'The xlsx spreadsheet describing the campaign audience and messages.',
            ['connection', 'template', 'dispatch_config', 'name'],
        ),
    },
];

/**
 * Locate an operation by path + method, tolerating a trailing-slash mismatch
 * between the override and the extracted path string.
 * @returns The operation and the resolved path key, or null if not found.
 */
function findOperation(
    spec: OpenApiSpec,
    path: string,
    method: HttpMethod,
): { op: OpenApiOperation; pathKey: string } | null {
    const candidates = [path, path.replace(/\/+$/, ''), path.endsWith('/') ? path : path + '/'];
    for (const candidate of candidates) {
        const item = spec.paths[candidate];
        const op = item?.[method];
        if (op) return { op, pathKey: candidate };
    }
    return null;
}

/** Result of applying the overrides, for logging and assertions. */
export interface OverrideResult {
    applied: string[];
    missing: string[];
}

/**
 * Apply a set of overrides to a spec IN PLACE and return which were applied vs.
 * which targeted a missing operation (a signal the spec drifted and the
 * override needs revisiting).
 * @param spec The extracted spec (mutated).
 * @param overrides Defaults to {@link OVERRIDES}.
 */
export function applyOverrides(spec: OpenApiSpec, overrides: OperationOverride[] = OVERRIDES): OverrideResult {
    const applied: string[] = [];
    const missing: string[] = [];
    for (const override of overrides) {
        const found = findOperation(spec, override.path, override.method);
        const label = `${override.method.toUpperCase()} ${override.path}`;
        if (!found) {
            missing.push(label);
            continue;
        }
        const { op } = found;
        if (override.requestBody !== undefined) op.requestBody = override.requestBody;
        if (override.responses !== undefined) op.responses = override.responses;
        if (override.set) Object.assign(op, override.set);
        if (override.patch) override.patch(op);
        op['x-overridden'] = true;
        applied.push(label);
    }
    return { applied, missing };
}

/** True when the given operation consumes multipart/form-data. */
export function isMultipartOperation(op: OpenApiOperation | undefined): boolean {
    const content = (op?.requestBody as { content?: Record<string, unknown> } | undefined)?.content;
    return !!content && 'multipart/form-data' in content;
}

/** Re-export for convenience so pipeline code can iterate methods uniformly. */
export { HTTP_METHODS };
