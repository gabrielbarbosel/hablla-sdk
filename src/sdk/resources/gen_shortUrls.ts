import { Resource } from './base';

/** `short-urls` resource (generated from openapi.json). */
export class ShortUrls extends Resource {
    /**
     * deleteShortUrl.
     * @method DELETE /v1/workspaces/{workspace_id}/short-urls/{short_url_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteShortUrl(shortUrlId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/short-urls/{short_url_id}', { path: { short_url_id: shortUrlId }, query: opts.query });
    }

    /**
     * getShortUrl.
     * @method GET /v1/workspaces/{workspace_id}/short-urls/{short_url_id}
     * @remarks Any query params may be sent (none documented).
     */
    getShortUrl(shortUrlId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/short-urls/{short_url_id}', { path: { short_url_id: shortUrlId }, query: opts.query });
    }

    /**
     * updateShortUrl.
     * @method PUT /v1/workspaces/{workspace_id}/short-urls/{short_url_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateShortUrl(shortUrlId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/short-urls/{short_url_id}', { path: { short_url_id: shortUrlId }, body, query: opts.query });
    }

    /**
     * getAvailableSlug.
     * @method GET /v1/workspaces/{workspace_id}/short-urls/available-slug
     * @remarks Documented query: filters (extra keys allowed).
     */
    getAvailableSlug(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/short-urls/available-slug', { query: opts.query });
    }

    /**
     * listShortUrls.
     * @method GET /v1/workspaces/{workspace_id}/short-urls
     * @remarks Documented query: filters (extra keys allowed).
     */
    listShortUrls(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/short-urls', { query: opts.query });
    }

    /**
     * createShortUrl.
     * @method POST /v1/workspaces/{workspace_id}/short-urls
     * @remarks Any query params may be sent (none documented).
     */
    createShortUrl(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/short-urls', { body, query: opts.query });
    }
}
