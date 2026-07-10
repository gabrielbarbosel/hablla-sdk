import { Resource } from './base';

/** `wsusers` resource (generated from openapi.json). */
export class Wsusers extends Resource {
    /**
     * putAdmin.
     * @method PUT /v1/workspaces/{workspace_id}/wsusers/admin
     * @remarks Any query params may be sent (none documented).
     */
    putAdmin(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/wsusers/admin', { body, query: opts.query });
    }

    /**
     * getCounters.
     * @method GET /v1/workspaces/{workspace_id}/wsusers/logs/counters
     * @remarks Documented query: query (extra keys allowed).
     */
    getCounters(opts: { query?: { query?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/wsusers/logs/counters', { query: opts.query });
    }

    /**
     * getLogs.
     * @method GET /v1/workspaces/{workspace_id}/wsusers/logs
     * @remarks Documented query: filters (extra keys allowed).
     */
    getLogs(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/wsusers/logs', { query: opts.query });
    }

    /**
     * getMe.
     * @method GET /v1/workspaces/{workspace_id}/wsusers/me
     * @remarks Any query params may be sent (none documented).
     */
    getMe(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/wsusers/me', { query: opts.query });
    }

    /**
     * updateWsuser.
     * @method PATCH /v1/workspaces/{workspace_id}/wsusers
     * @remarks Any query params may be sent (none documented).
     */
    updateWsuser(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/wsusers', { body, query: opts.query });
    }
}
