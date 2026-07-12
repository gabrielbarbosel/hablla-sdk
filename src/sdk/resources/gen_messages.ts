import { Resource } from './base';

/** `messages` resource (generated from openapi.json). */
export class Messages extends Resource {
    /**
     * Mark message as read.
     * @method PATCH /v1/workspaces/{workspace_id}/connections/{connection_id}/messages/read
     * @remarks Any query params may be sent (none documented).
     */
    patchRead(connectionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/connections/{connection_id}/messages/read', { path: { connection_id: connectionId }, body, query: opts.query });
    }

    /**
     * Send email messages by bot.
     * @method POST /v1/workspaces/{workspace_id}/connections/{connection_id}/messages-bot
     * @remarks Any query params may be sent (none documented).
     */
    MessagesController_createMessagesConnByBot_v1(connectionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/connections/{connection_id}/messages-bot', { path: { connection_id: connectionId }, body, query: opts.query });
    }

    /**
     * Create a message connections by a bot.
     * @method POST /v1/workspaces/{workspace_id}/connections/{connection_id}/messages-message-bot
     * @remarks Any query params may be sent (none documented).
     */
    messagesMessageBot(connectionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/connections/{connection_id}/messages-message-bot', { path: { connection_id: connectionId }, body, query: opts.query });
    }

    /**
     * Create a message templates connections by a bot.
     * @method POST /v1/workspaces/{workspace_id}/connections/{connection_id}/messages-templates-bot
     * @remarks Any query params may be sent (none documented).
     */
    messagesTemplatesBot(connectionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/connections/{connection_id}/messages-templates-bot', { path: { connection_id: connectionId }, body, query: opts.query });
    }

    /**
     * Create a message using bot.
     * @method POST /v1/workspaces/{workspace_id}/services/{service_id}/messages-bot
     * @remarks Any query params may be sent (none documented).
     */
    MessagesController_createByBot_v1(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/services/{service_id}/messages-bot', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Create a comment message on a service using workspace token.
     * @method POST /v1/workspaces/{workspace_id}/services/{service_id}/messages-comment
     * @remarks Any query params may be sent (none documented).
     */
    messagesComment(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/services/{service_id}/messages-comment', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Send message to a group.
     * @method POST /v1/workspaces/{workspace_id}/room/{room_id}
     * @remarks Any query params may be sent (none documented).
     */
    createRoom(roomId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/room/{room_id}', { path: { room_id: roomId }, body, query: opts.query });
    }
}
