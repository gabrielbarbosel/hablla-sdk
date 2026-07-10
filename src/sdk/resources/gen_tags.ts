import { Resource } from './base';
import type { Paged } from '../core/types';

/** A tag. */
export interface Tag {
    id: string;
    name?: string;
    std_name?: string;
    color?: string;
    workspace?: string;
    workspace_id?: string;
    sector_id?: unknown;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

/** `tags` resource (generated from openapi.json). */
export class Tags extends Resource {
    /**
     * Delete tag by id.
     * @method DELETE /v1/workspaces/{workspace_id}/tags/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteTag(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/tags/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Get tag by id.
     * @method GET /v1/workspaces/{workspace_id}/tags/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getTag(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<Tag> {
        return this.http.get('/v1/workspaces/{workspace_id}/tags/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Update tag by id.
     * @method PUT /v1/workspaces/{workspace_id}/tags/{id}
     * @remarks Any query params may be sent (none documented).
     */
    updateTag(id: string, body: Partial<Tag>, opts: { query?: Record<string, unknown> } = {}): Promise<Tag> {
        return this.http.put('/v1/workspaces/{workspace_id}/tags/{id}', { path: { id }, body, query: opts.query });
    }

    /**
     * Get all tags.
     * @method GET /v1/workspaces/{workspace_id}/tags
     * @remarks Documented query: filters, page, limit, order, direction_order, name, sector, populate (extra keys allowed).
     */
    listTags(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; sector?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Tag>> {
        return this.http.get('/v1/workspaces/{workspace_id}/tags', { query: opts.query });
    }

    /**
     * Create a tag.
     * @method POST /v1/workspaces/{workspace_id}/tags
     * @remarks Any query params may be sent (none documented).
     */
    createTag(body: Partial<Tag>, opts: { query?: Record<string, unknown> } = {}): Promise<Tag> {
        return this.http.post('/v1/workspaces/{workspace_id}/tags', { body, query: opts.query });
    }
}
