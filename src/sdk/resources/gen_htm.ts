import { Resource } from './base';

/** `htm` resource (generated from openapi.json). */
export class Htm extends Resource {
    /**
     * deleteContainer.
     * @method DELETE /v1/workspaces/{workspace_id}/htm/container/{container_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteContainer(containerId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/htm/container/{container_id}', { path: { container_id: containerId }, query: opts.query });
    }

    /**
     * getHTMById.
     * @method GET /v1/workspaces/{workspace_id}/htm/container/{container_id}
     * @remarks Any query params may be sent (none documented).
     */
    getHTMById(containerId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/htm/container/{container_id}', { path: { container_id: containerId }, query: opts.query });
    }

    /**
     * putContainer.
     * @method PUT /v1/workspaces/{workspace_id}/htm/container/{container_id}
     * @remarks Any query params may be sent (none documented).
     */
    putContainer(containerId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/htm/container/{container_id}', { path: { container_id: containerId }, body, query: opts.query });
    }

    /**
     * deleteTag.
     * @method DELETE /v1/workspaces/{workspace_id}/htm/tag/{tag_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteTag(tagId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/htm/tag/{tag_id}', { path: { tag_id: tagId }, query: opts.query });
    }

    /**
     * getHTMTagsById.
     * @method GET /v1/workspaces/{workspace_id}/htm/tag/{tag_id}
     * @remarks Any query params may be sent (none documented).
     */
    getHTMTagsById(tagId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/htm/tag/{tag_id}', { path: { tag_id: tagId }, query: opts.query });
    }

    /**
     * putTag.
     * @method PUT /v1/workspaces/{workspace_id}/htm/tag/{tag_id}
     * @remarks Any query params may be sent (none documented).
     */
    putTag(tagId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/htm/tag/{tag_id}', { path: { tag_id: tagId }, body, query: opts.query });
    }

    /**
     * getAllHTM.
     * @method GET /v1/workspaces/{workspace_id}/htm/container
     * @remarks Documented query: filters (extra keys allowed).
     */
    getAllHTM(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/htm/container', { query: opts.query });
    }

    /**
     * container.
     * @method POST /v1/workspaces/{workspace_id}/htm/container
     * @remarks Any query params may be sent (none documented).
     */
    container(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/htm/container', { body, query: opts.query });
    }

    /**
     * getAllHTMTags.
     * @method GET /v1/workspaces/{workspace_id}/htm/tag
     * @remarks Documented query: filters (extra keys allowed).
     */
    getAllHTMTags(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/htm/tag', { query: opts.query });
    }

    /**
     * tag.
     * @method POST /v1/workspaces/{workspace_id}/htm/tag
     * @remarks Any query params may be sent (none documented).
     */
    tag(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/htm/tag', { body, query: opts.query });
    }
}
