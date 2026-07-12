import { Resource } from './base';

/** `calls` resource (generated from openapi.json). */
export class Calls extends Resource {
    /**
     * createCall.
     * @method POST /v1/workspaces/{workspace_id}/calls
     * @remarks Any query params may be sent (none documented).
     */
    createCall(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/calls', { body, query: opts.query });
    }
}
