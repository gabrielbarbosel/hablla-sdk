import { Resource } from './base';

/** `webhooks` resource (generated from openapi.json). */
export class Webhooks extends Resource {
    /**
     * updateWebhook.
     * @method PUT /v1/workspaces/{workspace_id}/webhooks/{webhook_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateWebhook(webhookId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/webhooks/{webhook_id}', { path: { webhook_id: webhookId }, body, query: opts.query });
    }

    /**
     * createWebhook.
     * @method POST /v1/workspaces/{workspace_id}/webhooks
     * @remarks Any query params may be sent (none documented).
     */
    createWebhook(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/webhooks', { body, query: opts.query });
    }
}
