import { Resource } from './base';

/** `reasons` resource (generated from openapi.json). */
export class Reasons extends Resource {
    /**
     * Get reason by id.
     * @method GET /v1/workspaces/{workspace_id}/reasons/{reason_id}
     * @remarks Any query params may be sent (none documented).
     */
    getReason(reasonId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reasons/{reason_id}', { path: { reason_id: reasonId }, query: opts.query });
    }

    /**
     * Update reason by id.
     * @method PUT /v1/workspaces/{workspace_id}/reasons/{reason_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateReason(reasonId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/reasons/{reason_id}', { path: { reason_id: reasonId }, body, query: opts.query });
    }

    /**
     * Get all reasons.
     * @method GET /v1/workspaces/{workspace_id}/reasons
     * @remarks Documented query: filters, page, limit, order, direction_order, name, sector, type, populate (extra keys allowed).
     */
    listReasons(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; sector?: string; type?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reasons', { query: opts.query });
    }

    /**
     * Create a reason.
     * @method POST /v1/workspaces/{workspace_id}/reasons
     * @remarks Any query params may be sent (none documented).
     */
    createReason(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/reasons', { body, query: opts.query });
    }
}
