import { Resource } from './base';

/** `count` resource (generated from openapi.json). */
export class Count extends Resource {
    /**
     * listCount.
     * @method GET /v1/workspaces/{workspace_id}/count
     * @remarks Any query params may be sent (none documented).
     */
    listCount(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/count', { query: opts.query });
    }
}
