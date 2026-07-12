import { Resource } from './base';

/** `export` resource (generated from openapi.json). */
export class Export extends Resource {
    /**
     * createExport.
     * @method POST /v1/workspaces/{workspace_id}/export
     * @remarks Any query params may be sent (none documented).
     */
    createExport(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/export', { body, query: opts.query });
    }
}
