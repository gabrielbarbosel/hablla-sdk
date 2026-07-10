import { Resource } from './base';

/** `import` resource (generated from openapi.json). */
export class Import extends Resource {
    /**
     * createImport.
     * @method POST /v1/workspaces/{workspace_id}/import
     * @remarks Any query params may be sent (none documented).
     */
    createImport(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/import', { body, query: opts.query });
    }
}
