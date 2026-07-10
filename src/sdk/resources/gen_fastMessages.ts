import { Resource } from './base';

/** `fast-messages` resource (generated from openapi.json). */
export class FastMessages extends Resource {
    /**
     * deleteFastMessage.
     * @method DELETE /v1/workspaces/{workspace_id}/fast-messages/{fast_message_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteFastMessage(fastMessageId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/fast-messages/{fast_message_id}', { path: { fast_message_id: fastMessageId }, query: opts.query });
    }

    /**
     * getFastMessage.
     * @method GET /v1/workspaces/{workspace_id}/fast-messages/{fast_message_id}
     * @remarks Any query params may be sent (none documented).
     */
    getFastMessage(fastMessageId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/fast-messages/{fast_message_id}', { path: { fast_message_id: fastMessageId }, query: opts.query });
    }

    /**
     * updateFastMessage.
     * @method PUT /v1/workspaces/{workspace_id}/fast-messages/{fast_message_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateFastMessage(fastMessageId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/fast-messages/{fast_message_id}', { path: { fast_message_id: fastMessageId }, body, query: opts.query });
    }

    /**
     * listFastMessages.
     * @method GET /v1/workspaces/{workspace_id}/fast-messages
     * @remarks Documented query: filters (extra keys allowed).
     */
    listFastMessages(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/fast-messages', { query: opts.query });
    }

    /**
     * createFastMessage.
     * @method POST /v1/workspaces/{workspace_id}/fast-messages
     * @remarks Any query params may be sent (none documented).
     */
    createFastMessage(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/fast-messages', { body, query: opts.query });
    }
}
