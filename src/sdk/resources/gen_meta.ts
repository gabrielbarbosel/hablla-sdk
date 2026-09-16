import { Resource } from './base';

/** `meta` resource (generated from openapi.json). */
export class Meta extends Resource {
    /**
     * Get analytics.
     * @method GET /v1/workspaces/{workspace_id}/meta/analytics
     * @remarks Any query params may be sent (none documented).
     */
    getAnalytics(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/meta/analytics', { query: opts.query });
    }

    /**
     * Start fanpage onboarding: list the available pages.
     * @method POST /v1/workspaces/{workspace_id}/meta/fanpage-auth
     * @remarks Any query params may be sent (none documented).
     */
    fanpageAuth(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/meta/fanpage-auth', { body, query: opts.query });
    }

    /**
     * Start instagram onboarding: list the pages with a linked account.
     * @method POST /v1/workspaces/{workspace_id}/meta/instagram-auth
     * @remarks Any query params may be sent (none documented).
     */
    instagramAuth(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/meta/instagram-auth', { body, query: opts.query });
    }

    /**
     * Get profile.
     * @method GET /v1/workspaces/{workspace_id}/meta/profile
     * @remarks Any query params may be sent (none documented).
     */
    getProfile(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/meta/profile', { query: opts.query });
    }

    /**
     * Update profile.
     * @method PUT /v1/workspaces/{workspace_id}/meta/profile
     * @remarks Any query params may be sent (none documented).
     */
    putProfile(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/meta/profile', { body, query: opts.query });
    }

    /**
     * Start whatsapp onboarding: list the available phone numbers.
     * @method POST /v1/workspaces/{workspace_id}/meta/whatsapp-auth
     * @remarks Documented query: code (extra keys allowed).
     */
    whatsappAuth(body: Record<string, unknown>, opts: { query?: { code?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/meta/whatsapp-auth', { body, query: opts.query });
    }

    /**
     * Auth on meta.
     * @method GET /v2/workspaces/{workspace_id}/meta/auth
     * @remarks Any query params may be sent (none documented).
     */
    getAuth(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v2/workspaces/{workspace_id}/meta/auth', { query: opts.query });
    }

    /**
     * Create connection on meta.
     * @method POST /v2/workspaces/{workspace_id}/meta/auth
     * @remarks Any query params may be sent (none documented).
     */
    auth(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v2/workspaces/{workspace_id}/meta/auth', { body, query: opts.query });
    }
}
