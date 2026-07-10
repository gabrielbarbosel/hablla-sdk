import { Resource } from './base';

/** `lists` resource (generated from openapi.json). */
export class Lists extends Resource {
    /**
     * Delete list.
     * @method DELETE /v1/workspaces/{workspace_id}/boards/{board_id}/lists/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteList(boardId: string, id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/boards/{board_id}/lists/{id}', { path: { board_id: boardId, id }, query: opts.query });
    }

    /**
     * Get list by id.
     * @method GET /v1/workspaces/{workspace_id}/boards/{board_id}/lists/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getList(boardId: string, id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/boards/{board_id}/lists/{id}', { path: { board_id: boardId, id }, query: opts.query });
    }

    /**
     * Update list by id.
     * @method PUT /v1/workspaces/{workspace_id}/boards/{board_id}/lists/{id}
     * @remarks Any query params may be sent (none documented).
     */
    updateList(boardId: string, id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/boards/{board_id}/lists/{id}', { path: { board_id: boardId, id }, body, query: opts.query });
    }

    /**
     * Get all lists.
     * @method GET /v1/workspaces/{workspace_id}/boards/{board_id}/lists
     * @remarks Documented query: filters, page, limit, order, direction_order, name, populate (extra keys allowed).
     */
    listLists(boardId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/boards/{board_id}/lists', { path: { board_id: boardId }, query: opts.query });
    }

    /**
     * Create a list.
     * @method POST /v1/workspaces/{workspace_id}/boards/{board_id}/lists
     * @remarks Any query params may be sent (none documented).
     */
    createList(boardId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/boards/{board_id}/lists', { path: { board_id: boardId }, body, query: opts.query });
    }
}
