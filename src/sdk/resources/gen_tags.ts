import { Resource } from './base';

/** `tags` resource (generated from openapi.json). */
export class Tags extends Resource {
    /**
     * Delete tag by id.
     * @method DELETE /v1/workspaces/{workspace_id}/tags/{tag_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteTag(tagId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/tags/{tag_id}', { path: { tag_id: tagId }, query: opts.query });
    }

    /**
     * Get tag by id.
     * @method GET /v1/workspaces/{workspace_id}/tags/{tag_id}
     * @remarks Any query params may be sent (none documented).
     */
    getTag(tagId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/tags/{tag_id}', { path: { tag_id: tagId }, query: opts.query });
    }

    /**
     * Update tag by id.
     * @method PUT /v1/workspaces/{workspace_id}/tags/{tag_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateTag(tagId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/tags/{tag_id}', { path: { tag_id: tagId }, body, query: opts.query });
    }

    /**
     * Get all tags.
     * @method GET /v1/workspaces/{workspace_id}/tags
     * @remarks Documented query: filters, page, limit, order, direction_order, name, sector, populate (extra keys allowed).
     */
    listTags(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; sector?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/tags', { query: opts.query });
    }

    /**
     * Create a tag.
     * @method POST /v1/workspaces/{workspace_id}/tags
     * @remarks Any query params may be sent (none documented).
     */
    createTag(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/tags', { body, query: opts.query });
    }
}
