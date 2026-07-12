import { Resource } from './base';

/** `root` resource (generated from openapi.json). */
export class Root extends Resource {
    /**
     * Get all workspaces.
     * @method GET /v1/workspaces
     * @remarks Documented query: filters, page, limit, order, direction_order, name, search, type, plan_type, owner, partner, is_blocked, is_deleted, pending_plan, auto_invoice, created_at, updated_at (extra keys allowed).
     */
    getWorkspaces(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; search?: string; type?: string; plan_type?: string; owner?: string; partner?: string; is_blocked?: boolean; is_deleted?: boolean; pending_plan?: boolean; auto_invoice?: boolean; created_at?: unknown; updated_at?: unknown } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces', { query: opts.query });
    }

    /**
     * workspaces.
     * @method POST /v1/workspaces
     * @remarks Any query params may be sent (none documented).
     */
    workspaces(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces', { body, query: opts.query });
    }

    /**
     * deleteRoot.
     * @method DELETE /v1/workspaces/{workspace_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteRoot(opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}', { query: opts.query });
    }

    /**
     * Get workspace by id.
     * @method GET /v1/workspaces/{workspace_id}
     * @remarks Any query params may be sent (none documented).
     */
    getRoot(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}', { query: opts.query });
    }

    /**
     * putRoot.
     * @method PUT /v1/workspaces/{workspace_id}
     * @remarks Any query params may be sent (none documented).
     */
    putRoot(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}', { body, query: opts.query });
    }
}
