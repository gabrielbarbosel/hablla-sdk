import { Resource } from './base';
import type { Paged } from '../core/types';

/** A connection (channel integration). */
export interface Connection {
    id: string;
    workspace?: string;
    credential?: string;
    sector?: string;
    name?: string;
    std_name?: string;
    type?: string;
    color?: string;
    key?: string;
    status?: string;
    data?: unknown;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    credential_id?: string;
    sector_id?: string;
    [key: string]: unknown;
}

/** `connections` resource (generated from openapi.json). */
export class Connections extends Resource {
    /**
     * deleteTemplates.
     * @method DELETE /v1/workspaces/{workspace_id}/connections/{connection_id}/templates/{template_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteTemplates(connectionId: string, templateId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/connections/{connection_id}/templates/{template_id}', { path: { connection_id: connectionId, template_id: templateId }, query: opts.query });
    }

    /**
     * getTemplate.
     * @method GET /v1/workspaces/{workspace_id}/connections/{connection_id}/templates/{template_id}
     * @remarks Any query params may be sent (none documented).
     */
    getTemplate(connectionId: string, templateId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Connection> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections/{connection_id}/templates/{template_id}', { path: { connection_id: connectionId, template_id: templateId }, query: opts.query });
    }

    /**
     * putTemplates.
     * @method PUT /v1/workspaces/{workspace_id}/connections/{connection_id}/templates/{template_id}
     * @remarks Any query params may be sent (none documented).
     */
    putTemplates(connectionId: string, templateId: string, body: Partial<Connection>, opts: { query?: Record<string, unknown> } = {}): Promise<Connection> {
        return this.http.put('/v1/workspaces/{workspace_id}/connections/{connection_id}/templates/{template_id}', { path: { connection_id: connectionId, template_id: templateId }, body, query: opts.query });
    }

    /**
     * getChat.
     * @method GET /v1/workspaces/{workspace_id}/connections/{connection_id}/templates/chat
     * @remarks Documented query: filters (extra keys allowed).
     */
    getChat(connectionId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Connection>> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections/{connection_id}/templates/chat', { path: { connection_id: connectionId }, query: opts.query });
    }

    /**
     * duplicate.
     * @method POST /v1/workspaces/{workspace_id}/connections/{connection_id}/templates/duplicate/{duplicate_id}
     * @remarks Any query params may be sent (none documented).
     */
    duplicate(connectionId: string, duplicateId: string, body: Partial<Connection>, opts: { query?: Record<string, unknown> } = {}): Promise<Connection> {
        return this.http.post('/v1/workspaces/{workspace_id}/connections/{connection_id}/templates/duplicate/{duplicate_id}', { path: { connection_id: connectionId, duplicate_id: duplicateId }, body, query: opts.query });
    }

    /**
     * listTemplates.
     * @method GET /v1/workspaces/{workspace_id}/connections/{connection_id}/templates
     * @remarks Documented query: filters (extra keys allowed).
     */
    listTemplates(connectionId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Connection>> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections/{connection_id}/templates', { path: { connection_id: connectionId }, query: opts.query });
    }

    /**
     * templatesV1.
     * @method POST /v1/workspaces/{workspace_id}/connections/{connection_id}/templates
     * @remarks Any query params may be sent (none documented).
     */
    templatesV1(connectionId: string, body: Partial<Connection>, opts: { query?: Record<string, unknown> } = {}): Promise<Connection> {
        return this.http.post('/v1/workspaces/{workspace_id}/connections/{connection_id}/templates', { path: { connection_id: connectionId }, body, query: opts.query });
    }

    /**
     * Get all messages by connection id and to.
     * @method GET /v1/workspaces/{workspace_id}/connections/{id}/messages
     * @remarks Documented query: page, limit, order, direction_order, user, body, populate, start_date, end_date, to (extra keys allowed).
     */
    getMessages(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; user?: string; body?: string; populate?: string[]; start_date?: string; end_date?: string; to?: string } & Record<string, unknown> } = {}): Promise<Paged<Connection>> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections/{id}/messages', { path: { id }, query: opts.query });
    }

    /**
     * Get all meta waba logs for a connection.
     * @method GET /v1/workspaces/{workspace_id}/connections/{id}/meta-waba-logs
     * @remarks Documented query: filters, page, limit, order, direction_order, type, start_date, end_date, populate (extra keys allowed).
     */
    getMetaWabaLogs(id: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; type?: string; start_date?: string; end_date?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Connection>> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections/{id}/meta-waba-logs', { path: { id }, query: opts.query });
    }

    /**
     * Register a whatsapp connection on Meta.
     * @method POST /v1/workspaces/{workspace_id}/connections/{id}/register
     * @remarks Any query params may be sent (none documented).
     */
    register(id: string, body: Partial<Connection>, opts: { query?: Record<string, unknown> } = {}): Promise<Connection> {
        return this.http.post('/v1/workspaces/{workspace_id}/connections/{id}/register', { path: { id }, body, query: opts.query });
    }

    /**
     * Subscribe apps on Meta for a connection.
     * @method POST /v1/workspaces/{workspace_id}/connections/{id}/subscribe-app
     * @remarks Any query params may be sent (none documented).
     */
    subscribeApp(id: string, body: Partial<Connection>, opts: { query?: Record<string, unknown> } = {}): Promise<Connection> {
        return this.http.post('/v1/workspaces/{workspace_id}/connections/{id}/subscribe-app', { path: { id }, body, query: opts.query });
    }

    /**
     * Get Meta subscribed apps for a connection.
     * @method GET /v1/workspaces/{workspace_id}/connections/{id}/subscribed-apps
     * @remarks Any query params may be sent (none documented).
     */
    getSubscribedApps(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Connection>> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections/{id}/subscribed-apps', { path: { id }, query: opts.query });
    }

    /**
     * Sync connection by id.
     * @method GET /v1/workspaces/{workspace_id}/connections/{id}/sync
     * @remarks Any query params may be sent (none documented).
     */
    sync(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Connection>> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections/{id}/sync', { path: { id }, query: opts.query });
    }

    /**
     * Delete connection by id.
     * @method DELETE /v1/workspaces/{workspace_id}/connections/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteConnection(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/connections/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Get connection by id.
     * @method GET /v1/workspaces/{workspace_id}/connections/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getConnection(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<Connection> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Update connection by id.
     * @method PUT /v1/workspaces/{workspace_id}/connections/{id}
     * @remarks Documented query: populate (extra keys allowed).
     */
    updateConnection(id: string, body: Partial<Connection>, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Connection> {
        return this.http.put('/v1/workspaces/{workspace_id}/connections/{id}', { path: { id }, body, query: opts.query });
    }

    /**
     * Get available connections.
     * @method GET /v1/workspaces/{workspace_id}/connections/availables
     * @remarks Any query params may be sent (none documented).
     */
    getAvailables(opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Connection>> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections/availables', { query: opts.query });
    }

    /**
     * Get connections counter.
     * @method GET /v1/workspaces/{workspace_id}/connections/counters
     * @remarks Any query params may be sent (none documented).
     */
    getCounters(opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Connection>> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections/counters', { query: opts.query });
    }

    /**
     * Get connections by array of ids.
     * @method GET /v1/workspaces/{workspace_id}/connections/multiple
     * @remarks Documented query: ids (extra keys allowed).
     */
    getMultiple(opts: { query?: { ids?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Connection>> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections/multiple', { query: opts.query });
    }

    /**
     * Get all connections.
     * @method GET /v1/workspaces/{workspace_id}/connections
     * @remarks Documented query: page, limit, order, direction_order, name, key, type, generic_type, types, status, populate, ids, is_deleted (extra keys allowed).
     */
    listConnectionsV1(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; name?: string; key?: string; type?: string; generic_type?: string; types?: string[]; status?: string; populate?: string[]; ids?: string[]; is_deleted?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Connection>> {
        return this.http.get('/v1/workspaces/{workspace_id}/connections', { query: opts.query });
    }

    /**
     * Create a connection.
     * @method POST /v1/workspaces/{workspace_id}/connections
     * @remarks Any query params may be sent (none documented).
     */
    createConnection(body: Partial<Connection>, opts: { query?: Record<string, unknown> } = {}): Promise<Connection> {
        return this.http.post('/v1/workspaces/{workspace_id}/connections', { body, query: opts.query });
    }

    /**
     * templates.
     * @method POST /v2/workspaces/{workspace_id}/connections/{connection_id}/templates
     * @remarks Any query params may be sent (none documented).
     */
    templates(connectionId: string, body: Partial<Connection>, opts: { query?: Record<string, unknown> } = {}): Promise<Connection> {
        return this.http.post('/v2/workspaces/{workspace_id}/connections/{connection_id}/templates', { path: { connection_id: connectionId }, body, query: opts.query });
    }

    /**
     * Get all connections (V2).
     * @method GET /v2/workspaces/{workspace_id}/connections
     * @remarks Documented query: filters, page, limit, order, direction_order, name, key, type, generic_type, types, status, populate, ids, is_deleted (extra keys allowed).
     */
    listConnections(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; key?: string; type?: string; generic_type?: string; types?: string[]; status?: string; populate?: string[]; ids?: string[]; is_deleted?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Connection>> {
        return this.http.get('/v2/workspaces/{workspace_id}/connections', { query: opts.query });
    }
}
