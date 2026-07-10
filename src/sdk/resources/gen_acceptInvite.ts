import { Resource } from './base';

/** `accept-invite` resource (generated from openapi.json). */
export class AcceptInvite extends Resource {
    /**
     * createAcceptInvite.
     * @method POST /v1/workspaces/{workspace_id}/accept-invite
     * @remarks Any query params may be sent (none documented).
     */
    createAcceptInvite(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/accept-invite', { body, query: opts.query });
    }
}
