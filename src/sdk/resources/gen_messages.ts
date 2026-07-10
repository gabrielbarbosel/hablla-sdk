import { Resource } from './base';

/** `messages` resource (generated from openapi.json). */
export class Messages extends Resource {
    /**
     * Send email messages by bot.
     * @method POST /v1/workspaces/{workspace_id}/connections/{connection_id}/messages-bot
     * @remarks Any query params may be sent (none documented).
     */
    createConnectionsMessagesBot(connectionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
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
     * Create a message templates connections.
     * @method POST /v1/workspaces/{workspace_id}/connections/{connection_id}/messages-templates
     * @remarks Any query params may be sent (none documented).
     */
    createConnectionsMessagesTemplates(connectionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/connections/{connection_id}/messages-templates', { path: { connection_id: connectionId }, body, query: opts.query });
    }

    /**
     * Mark message as read.
     * @method PATCH /v1/workspaces/{workspace_id}/connections/{connection_id}/messages/read
     * @remarks Any query params may be sent (none documented).
     */
    patchRead(connectionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/connections/{connection_id}/messages/read', { path: { connection_id: connectionId }, body, query: opts.query });
    }

    /**
     * Create a message connection.
     * @method POST /v1/workspaces/{workspace_id}/connections/{connection_id}/messages
     * @remarks Any query params may be sent (none documented).
     */
    createMessage(connectionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/connections/{connection_id}/messages', { path: { connection_id: connectionId }, body, query: opts.query });
    }

    /**
     * Send message to a group.
     * @method POST /v1/workspaces/{workspace_id}/room/{room_id}
     * @remarks Any query params may be sent (none documented).
     */
    room(roomId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/room/{room_id}', { path: { room_id: roomId }, body, query: opts.query });
    }

    /**
     * Create a message using bot.
     * @method POST /v1/workspaces/{workspace_id}/services/{service_id}/messages-bot
     * @remarks Any query params may be sent (none documented).
     */
    createMessagesBot(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
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
     * Create a message template.
     * @method POST /v1/workspaces/{workspace_id}/services/{service_id}/messages-templates
     * @remarks Any query params may be sent (none documented).
     */
    createMessagesTemplates(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/services/{service_id}/messages-templates', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Delete a message (of type comment) by id.
     * @method DELETE /v1/workspaces/{workspace_id}/services/{service_id}/messages/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteMessage(serviceId: string, id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/services/{service_id}/messages/{id}', { path: { service_id: serviceId, id }, query: opts.query });
    }

    /**
     * Update a message (of type comment) by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{service_id}/messages/{id}
     * @remarks Any query params may be sent (none documented).
     */
    updateMessage(serviceId: string, id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{service_id}/messages/{id}', { path: { service_id: serviceId, id }, body, query: opts.query });
    }

    /**
     * Create a message.
     * @method POST /v1/workspaces/{workspace_id}/services/{service_id}/messages
     * @remarks Any query params may be sent (none documented).
     */
    createMessageV1(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/services/{service_id}/messages', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Create a message v2.
     * @method POST /v2/workspaces/{workspace_id}/services/{service_id}/messages
     * @remarks Any query params may be sent (none documented).
     */
    createMessageV2(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v2/workspaces/{workspace_id}/services/{service_id}/messages', { path: { service_id: serviceId }, body, query: opts.query });
    }
}
