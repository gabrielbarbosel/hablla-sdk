import { Resource } from './base';

/** `superuser` resource (generated from openapi.json). */
export class Superuser extends Resource {
    /**
     * updateSuperuser.
     * @method PUT /v1/workspaces/{workspace_id}/superuser
     * @remarks Any query params may be sent (none documented).
     */
    updateSuperuser(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/superuser', { body, query: opts.query });
    }
}
