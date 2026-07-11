import { Resource } from './base';

/** `queue-items` resource (generated from openapi.json). */
export class QueueItems extends Resource {
    /**
     * Delete queue item by key.
     * @method DELETE /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/key/{key}
     * @remarks Any query params may be sent (none documented).
     */
    deleteKey(queueId: string, key: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/key/{key}', { path: { queue_id: queueId, key }, query: opts.query });
    }

    /**
     * Get queue item by id.
     * @method GET /v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getQueueItem(queueId: string, id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/queues/{queue_id}/queue-items/{id}', { path: { queue_id: queueId, id }, query: opts.query });
    }
}
