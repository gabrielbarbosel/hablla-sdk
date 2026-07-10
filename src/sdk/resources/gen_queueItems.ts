import { Resource } from './base';

/** `queue-items` resource (generated from openapi.json). */
export class QueueItems extends Resource {
    /**
     * Delete queue item.
     * @method DELETE /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteQueueItem(queueId: string, id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{id}', { path: { queue_id: queueId, id }, query: opts.query });
    }

    /**
     * Get queue item by id.
     * @method GET /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getQueueItem(queueId: string, id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{id}', { path: { queue_id: queueId, id }, query: opts.query });
    }

    /**
     * Update queue item by id.
     * @method PUT /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{id}
     * @remarks Any query params may be sent (none documented).
     */
    updateQueueItem(queueId: string, id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{id}', { path: { queue_id: queueId, id }, body, query: opts.query });
    }

    /**
     * Delete queue item by key.
     * @method DELETE /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/key/{key}
     * @remarks Any query params may be sent (none documented).
     */
    deleteKey(queueId: string, key: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/key/{key}', { path: { queue_id: queueId, key }, query: opts.query });
    }

    /**
     * Get all queue items.
     * @method GET /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items
     * @remarks Documented query: filters, page, limit, order, direction_order, key, populate (extra keys allowed).
     */
    listQueueItems(queueId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; key?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items', { path: { queue_id: queueId }, query: opts.query });
    }

    /**
     * Create a queue item.
     * @method POST /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items
     * @remarks Any query params may be sent (none documented).
     */
    createQueueItem(queueId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items', { path: { queue_id: queueId }, body, query: opts.query });
    }
}
