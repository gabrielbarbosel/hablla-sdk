import { Resource } from './base';

/** `user` resource (generated from openapi.json). */
export class User extends Resource {
    /**
     * listUser.
     * @method GET /v1/workspaces/{workspace_id}/user
     * @remarks Any query params may be sent (none documented).
     */
    listUser(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/user', { query: opts.query });
    }
}
