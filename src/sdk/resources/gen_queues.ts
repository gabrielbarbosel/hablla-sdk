import { Resource } from './base';

/** `queues` resource (generated from openapi.json). */
export class Queues extends Resource {
    /**
     * Delete queue item.
     * @method DELETE /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{queue_item_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteQueueItems(queueId: string, queueItemId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{queue_item_id}', { path: { queue_id: queueId, queue_item_id: queueItemId }, query: opts.query });
    }

    /**
     * Update queue item by id.
     * @method PUT /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{queue_item_id}
     * @remarks Any query params may be sent (none documented).
     */
    putQueueItems(queueId: string, queueItemId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{queue_item_id}', { path: { queue_id: queueId, queue_item_id: queueItemId }, body, query: opts.query });
    }

    /**
     * Clear queue by id.
     * @method GET /v1/workspaces/{workspace_id}/queues/{id}/clear
     * @remarks Any query params may be sent (none documented).
     */
    getClear(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/queues/{id}/clear', { path: { id }, query: opts.query });
    }

    /**
     * Get all queue logs.
     * @method GET /v1/workspaces/{workspace_id}/queues/{id}/logs
     * @remarks Documented query: page, limit, order, direction_order, key, populate (extra keys allowed).
     */
    getLogs(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; key?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/queues/{id}/logs', { path: { id }, query: opts.query });
    }

    /**
     * Get queue by id.
     * @method GET /v1/workspaces/{workspace_id}/queues/{id}/next
     * @remarks Any query params may be sent (none documented).
     */
    getNext(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/queues/{id}/next', { path: { id }, query: opts.query });
    }

    /**
     * Get all queue items.
     * @method GET /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items
     * @remarks Documented query: filters, page, limit, order, direction_order, key, populate (extra keys allowed).
     */
    getQueueItems(queueId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; key?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items', { path: { queue_id: queueId }, query: opts.query });
    }

    /**
     * Create a queue item.
     * @method POST /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items
     * @remarks Any query params may be sent (none documented).
     */
    queueItems(queueId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items', { path: { queue_id: queueId }, body, query: opts.query });
    }

    /**
     * Reset queue by id.
     * @method GET /v1/workspaces/{workspace_id}/queues/{id}/reset
     * @remarks Any query params may be sent (none documented).
     */
    getReset(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/queues/{id}/reset', { path: { id }, query: opts.query });
    }

    /**
     * Sync queue by id.
     * @method GET /v1/workspaces/{workspace_id}/queues/{queue_id}/sync
     * @remarks Any query params may be sent (none documented).
     */
    sync(queueId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/queues/{queue_id}/sync', { path: { queue_id: queueId }, query: opts.query });
    }

    /**
     * Delete queue by id.
     * @method DELETE /v1/workspaces/{workspace_id}/queues/{queue_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteQueue(queueId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/queues/{queue_id}', { path: { queue_id: queueId }, query: opts.query });
    }

    /**
     * Get queue by id.
     * @method GET /v1/workspaces/{workspace_id}/queues/{queue_id}
     * @remarks Any query params may be sent (none documented).
     */
    getQueue(queueId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/queues/{queue_id}', { path: { queue_id: queueId }, query: opts.query });
    }

    /**
     * Update queue by id.
     * @method PUT /v1/workspaces/{workspace_id}/queues/{queue_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateQueue(queueId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/queues/{queue_id}', { path: { queue_id: queueId }, body, query: opts.query });
    }

    /**
     * Get all queues.
     * @method GET /v1/workspaces/{workspace_id}/queues
     * @remarks Documented query: filters, page, limit, order, direction_order, name, populate (extra keys allowed).
     */
    listQueues(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/queues', { query: opts.query });
    }

    /**
     * Create a queue.
     * @method POST /v1/workspaces/{workspace_id}/queues
     * @remarks Any query params may be sent (none documented).
     */
    createQueue(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/queues', { body, query: opts.query });
    }
}
