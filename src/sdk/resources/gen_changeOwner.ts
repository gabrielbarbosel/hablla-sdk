import { Resource } from './base';

/** `change-owner` resource (generated from openapi.json). */
export class ChangeOwner extends Resource {
    /**
     * patchChangeOwner.
     * @method PATCH /v1/workspaces/{workspace_id}/change-owner
     * @remarks Any query params may be sent (none documented).
     */
    patchChangeOwner(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/change-owner', { body, query: opts.query });
    }
}
