import { Resource } from './base';

/** `remove-user` resource (generated from openapi.json). */
export class RemoveUser extends Resource {
    /**
     * deleteRemoveUser.
     * @method DELETE /v1/workspaces/{workspace_id}/remove-user
     * @remarks Documented query: id, data (extra keys allowed).
     */
    deleteRemoveUser(opts: { query?: { id?: string; data?: string } & Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/remove-user', { query: opts.query });
    }
}
