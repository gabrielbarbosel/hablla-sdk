import { serializeQuery, serializeQueryJson } from './query';

/** How a query object is serialized (see {@link serializeQuery} and {@link serializeQueryJson}). */
export type QueryFormat = 'indices' | 'json';

/** Everything needed to turn a path template plus parameters into an absolute URL. */
export interface RequestUrlParts {
    baseUrl: string;
    /** Fills any `{…workspace…}` token that `pathParams` does not provide. */
    workspaceId: string;
    /** Path template, e.g. `/v1/workspaces/{workspace_id}/persons/{person_id}`. */
    rawPath: string;
    pathParams?: Readonly<Record<string, unknown>>;
    query?: Readonly<Record<string, unknown>>;
    /** Defaults to `'indices'`, the web app's `qs` convention. */
    queryFormat?: QueryFormat;
}

/**
 * Resolves the path template and appends the serialized query. A token `{a.b}` is
 * looked up by its last segment (`b`); a token naming the workspace falls back to
 * `workspaceId`. Every value is URL-encoded.
 *
 * @throws Error when a token has no value.
 */
export function buildRequestUrl(parts: RequestUrlParts): string {
    const serialize = parts.queryFormat === 'json' ? serializeQueryJson : serializeQuery;

    return parts.baseUrl + resolvePathTemplate(parts.rawPath, parts.pathParams ?? {}, parts.workspaceId) + serialize(parts.query);
}

/** Replaces each `{token}` of a path template with its encoded value. */
function resolvePathTemplate(rawPath: string, params: Readonly<Record<string, unknown>>, workspaceId: string): string {
    return rawPath.replace(/{([^}]+)}/g, (_match, token: string) => {
        const key = token.includes('.') ? token.slice(token.lastIndexOf('.') + 1) : token;
        const value = params[key] ?? (key.includes('workspace') ? workspaceId : null);

        if (value == null) {
            throw new Error('Missing path parameter: ' + token);
        }

        return encodeURIComponent(String(value));
    });
}
