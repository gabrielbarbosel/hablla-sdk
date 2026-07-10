import { Resource } from './base';

/** `new-prefix` resource (generated from openapi.json). */
export class NewPrefix extends Resource {
    /**
     * createNewPrefix.
     * @method POST /v1/workspaces/{workspace_id}/new-prefix
     * @remarks Any query params may be sent (none documented).
     */
    createNewPrefix(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/new-prefix', { body, query: opts.query });
    }
}
