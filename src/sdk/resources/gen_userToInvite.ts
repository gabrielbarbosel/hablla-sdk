import { Resource } from './base';

/** `user-to-invite` resource (generated from openapi.json). */
export class UserToInvite extends Resource {
    /**
     * listUserToInvite.
     * @method GET /v1/workspaces/{workspace_id}/user-to-invite
     * @remarks Any query params may be sent (none documented).
     */
    listUserToInvite(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/user-to-invite', { query: opts.query });
    }
}
