import { Resource } from './base';

/** `users` resource (generated from openapi.json). */
export class Users extends Resource {
    /**
     * getCalendar.
     * @method GET /v1/users/{id}/calendar
     * @remarks Documented query: sync (extra keys allowed).
     */
    getCalendar(id: string, opts: { query?: { sync?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/users/{id}/calendar', { path: { id }, query: opts.query });
    }

    /**
     * updateUser.
     * @method PUT /v1/users/{user_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateUser(userId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/users/{user_id}', { path: { user_id: userId }, body, query: opts.query });
    }

    /**
     * getHabllaDomain.
     * @method GET /v1/users/hablla-domain
     * @remarks Any query params may be sent (none documented).
     */
    getHabllaDomain(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/users/hablla-domain', { query: opts.query });
    }

    /**
     * getMe.
     * @method GET /v1/users/me
     * @remarks Any query params may be sent (none documented).
     */
    getMe(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/users/me', { query: opts.query });
    }

    /**
     * sendCode.
     * @method POST /v1/users/send-code
     * @remarks Any query params may be sent (none documented).
     */
    sendCode(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/users/send-code', { body, query: opts.query });
    }

    /**
     * verifyCode.
     * @method POST /v1/users/verify-code
     * @remarks Any query params may be sent (none documented).
     */
    verifyCode(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/users/verify-code', { body, query: opts.query });
    }

    /**
     * Get all users from a workspace by id.
     * @method GET /v1/workspaces/{workspace_id}/users
     * @remarks Documented query: filters, page, limit, order, direction_order, name, email, role_type, no_sector, no_person, no_service, permission, search, populate, start_date, end_date, field_date (extra keys allowed).
     */
    listUsers(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; email?: string; role_type?: string; no_sector?: string; no_person?: string; no_service?: string; permission?: string; search?: string; populate?: string[]; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/users', { query: opts.query });
    }
}
