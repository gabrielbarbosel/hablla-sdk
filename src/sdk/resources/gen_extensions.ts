import { Resource } from './base';

/** `extensions` resource (generated from openapi.json). */
export class Extensions extends Resource {
    /**
     * deleteExtension.
     * @method DELETE /v1/workspaces/{workspace_id}/extensions/{extension_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteExtension(extensionId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/extensions/{extension_id}', { path: { extension_id: extensionId }, query: opts.query });
    }

    /**
     * getExtension.
     * @method GET /v1/workspaces/{workspace_id}/extensions/{extension_id}
     * @remarks Any query params may be sent (none documented).
     */
    getExtension(extensionId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/extensions/{extension_id}', { path: { extension_id: extensionId }, query: opts.query });
    }

    /**
     * updateExtension.
     * @method PUT /v1/workspaces/{workspace_id}/extensions/{extension_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateExtension(extensionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/extensions/{extension_id}', { path: { extension_id: extensionId }, body, query: opts.query });
    }

    /**
     * getMe.
     * @method GET /v1/workspaces/{workspace_id}/extensions/me
     * @remarks Any query params may be sent (none documented).
     */
    getMe(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/extensions/me', { query: opts.query });
    }

    /**
     * listExtensions.
     * @method GET /v1/workspaces/{workspace_id}/extensions
     * @remarks Documented query: filters (extra keys allowed).
     */
    listExtensions(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/extensions', { query: opts.query });
    }

    /**
     * createExtension.
     * @method POST /v1/workspaces/{workspace_id}/extensions
     * @remarks Any query params may be sent (none documented).
     */
    createExtension(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/extensions', { body, query: opts.query });
    }
}
