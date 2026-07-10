import { Resource } from './base';

/** `cdn` resource (generated from openapi.json). */
export class Cdn extends Resource {
    /**
     * deleteCdn.
     * @method DELETE /v1/workspaces/{workspace_id}/cdn
     * @remarks Any query params may be sent (none documented).
     */
    deleteCdn(opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/cdn', { query: opts.query });
    }

    /**
     * createCdn.
     * @method POST /v1/workspaces/{workspace_id}/cdn
     * @remarks Any query params may be sent (none documented).
     */
    createCdn(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/cdn', { body, query: opts.query });
    }
}
