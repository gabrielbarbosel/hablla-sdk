import { Resource } from './base';

/** `copilot` resource (generated from openapi.json). */
export class Copilot extends Resource {
    /**
     * getReset.
     * @method GET /v1/workspaces/{workspace_id}/copilot/reset/{reset_id}
     * @remarks Any query params may be sent (none documented).
     */
    getReset(resetId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/copilot/reset/{reset_id}', { path: { reset_id: resetId }, query: opts.query });
    }

    /**
     * createCopilot.
     * @method POST /v1/workspaces/{workspace_id}/copilot
     * @remarks Any query params may be sent (none documented).
     */
    createCopilot(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/copilot', { body, query: opts.query });
    }
}
