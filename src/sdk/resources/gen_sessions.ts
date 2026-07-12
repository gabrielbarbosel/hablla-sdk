import { Resource } from './base';

/** `sessions` resource (generated from openapi.json). */
export class Sessions extends Resource {
    /**
     * Get session by id.
     * @method GET /v1/workspaces/{workspace_id}/sessions/{session_id}
     * @remarks Documented query: connection, key (extra keys allowed).
     */
    getSession(sessionId: string, opts: { query?: { connection?: string; key?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/sessions/{session_id}', { path: { session_id: sessionId }, query: opts.query });
    }

    /**
     * Get opened session by key.
     * @method GET /v1/workspaces/{workspace_id}/sessions/opened-session
     * @remarks Documented query: filters, connection, key (extra keys allowed).
     */
    getOpenedSession(opts: { query?: { filters?: string; connection?: string; key?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/sessions/opened-session', { query: opts.query });
    }

    /**
     * Get all sessions.
     * @method GET /v1/workspaces/{workspace_id}/sessions
     * @remarks Documented query: filters, page, limit, order, direction_order, key, connection, category, user_initiated, two_way_enable, has_error, is_valid, expire_at, type, populate, start_date, end_date, field_date (extra keys allowed).
     */
    listSessions(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; key?: string; connection?: string; category?: string; user_initiated?: string; two_way_enable?: boolean; has_error?: boolean; is_valid?: boolean; expire_at?: string; type?: string; populate?: string; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/sessions', { query: opts.query });
    }
}
