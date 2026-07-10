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
     * @method PUT /v1/users/{id}
     * @remarks Any query params may be sent (none documented).
     */
    updateUser(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/users/{id}', { path: { id }, body, query: opts.query });
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
}
