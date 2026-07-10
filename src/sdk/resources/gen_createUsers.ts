import { Resource } from './base';

/** `create-users` resource (generated from openapi.json). */
export class CreateUsers extends Resource {
    /**
     * createCreateUserV1.
     * @method POST /v1/workspaces/{workspace_id}/create-users
     * @remarks Any query params may be sent (none documented).
     */
    createCreateUserV1(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/create-users', { body, query: opts.query });
    }

    /**
     * createCreateUser.
     * @method POST /v2/workspaces/{workspace_id}/create-users
     * @remarks Any query params may be sent (none documented).
     */
    createCreateUser(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v2/workspaces/{workspace_id}/create-users', { body, query: opts.query });
    }
}
