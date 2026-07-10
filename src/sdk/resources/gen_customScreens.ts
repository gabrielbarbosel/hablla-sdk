import { Resource } from './base';

/** `custom-screens` resource (generated from openapi.json). */
export class CustomScreens extends Resource {
    /**
     * deleteCustomScreen.
     * @method DELETE /v1/workspaces/{workspace_id}/custom-screens/{custom_screen_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteCustomScreen(customScreenId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/custom-screens/{custom_screen_id}', { path: { custom_screen_id: customScreenId }, query: opts.query });
    }

    /**
     * getCustomScreen.
     * @method GET /v1/workspaces/{workspace_id}/custom-screens/{custom_screen_id}
     * @remarks Any query params may be sent (none documented).
     */
    getCustomScreen(customScreenId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/custom-screens/{custom_screen_id}', { path: { custom_screen_id: customScreenId }, query: opts.query });
    }

    /**
     * updateCustomScreen.
     * @method PUT /v1/workspaces/{workspace_id}/custom-screens/{custom_screen_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateCustomScreen(customScreenId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/custom-screens/{custom_screen_id}', { path: { custom_screen_id: customScreenId }, body, query: opts.query });
    }

    /**
     * listCustomScreens.
     * @method GET /v1/workspaces/{workspace_id}/custom-screens
     * @remarks Documented query: filters (extra keys allowed).
     */
    listCustomScreens(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/custom-screens', { query: opts.query });
    }

    /**
     * createCustomScreen.
     * @method POST /v1/workspaces/{workspace_id}/custom-screens
     * @remarks Any query params may be sent (none documented).
     */
    createCustomScreen(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/custom-screens', { body, query: opts.query });
    }
}
