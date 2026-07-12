import { Resource } from './base';
import type { MultipartFile, MultipartBody } from '../core/types';

/** `services` resource (generated from openapi.json). */
export class Services extends Resource {
    /**
     * Get all messages by service and connection.
     * @method GET /v1/workspaces/{workspace_id}/services/{service_id}/connection/{connection_id}/messages
     * @remarks Documented query: filters, page, limit, order, direction_order, user, body, type, key, populate, message, media_only (extra keys allowed).
     */
    getAllMediaMessagesByConnection(serviceId: string, connectionId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; user?: string; body?: string; type?: string; key?: string; populate?: string[]; message?: string; media_only?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{service_id}/connection/{connection_id}/messages', { path: { service_id: serviceId, connection_id: connectionId }, query: opts.query });
    }

    /**
     * Delete a message (of type comment) by id.
     * @method DELETE /v1/workspaces/{workspace_id}/services/{service_id}/messages/{message_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteMessages(serviceId: string, messageId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/services/{service_id}/messages/{message_id}', { path: { service_id: serviceId, message_id: messageId }, query: opts.query });
    }

    /**
     * Update a message (of type comment) by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{service_id}/messages/{message_id}
     * @remarks Any query params may be sent (none documented).
     */
    putMessages(serviceId: string, messageId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{service_id}/messages/{message_id}', { path: { service_id: serviceId, message_id: messageId }, body, query: opts.query });
    }

    /**
     * Do action on service by id.
     * @method PATCH /v1/workspaces/{workspace_id}/services/{service_id}/action
     * @remarks Any query params may be sent (none documented).
     */
    patchAction(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/services/{service_id}/action', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Add cards on service by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{service_id}/add-cards
     * @remarks Any query params may be sent (none documented).
     */
    addCards(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{service_id}/add-cards', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Add followers to service by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{service_id}/add-followers
     * @remarks Any query params may be sent (none documented).
     */
    addFollowers(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{service_id}/add-followers', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Add tags on service by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{service_id}/add-tags
     * @remarks Any query params may be sent (none documented).
     */
    addTags(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{service_id}/add-tags', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Create or associate a person with a service.
     * @method POST /v1/workspaces/{workspace_id}/services/{id}/associate
     * @remarks Any query params may be sent (none documented).
     */
    associate(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/services/{id}/associate', { path: { id }, body, query: opts.query });
    }

    /**
     * Update custom-fields on service by id.
     * @method PATCH /v1/workspaces/{workspace_id}/services/{service_id}/custom-fields
     * @remarks Any query params may be sent (none documented).
     */
    patchCustomFields(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/services/{service_id}/custom-fields', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Get emails from services by id.
     * @method GET /v1/workspaces/{workspace_id}/services/{id}/emails
     * @remarks Documented query: page, limit, order, direction_order, to, subject, text, user, person, service, populate (extra keys allowed).
     */
    getEmails(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; to?: string; subject?: string; text?: string; user?: string; person?: string; service?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}/emails', { path: { id }, query: opts.query });
    }

    /**
     * Get history (countless).
     * @method GET /v1/workspaces/{workspace_id}/services/{id}/history
     * @remarks Documented query: page, limit, order, retrieve_mode, direction_order, user, finished_by_user, person, connection, sector, reason, card, name, search, type, status, statuses, csat, populate, start_date, end_date, field_date, tags, sectors, fcr, win, key (extra keys allowed).
     */
    getHistory(id: string, opts: { query?: { page?: string; limit?: number; order?: string; retrieve_mode?: string; direction_order?: string; user?: string; finished_by_user?: string; person?: string; connection?: string; sector?: string; reason?: string; card?: string; name?: string; search?: string; type?: string; status?: string; statuses?: string; csat?: number; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; tags?: string[]; sectors?: string[]; fcr?: boolean; win?: boolean; key?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}/history', { path: { id }, query: opts.query });
    }

    /**
     * Get all services by permission.
     * @method GET /v1/workspaces/{workspace_id}/services/{id}/history-by-permission
     * @remarks Documented query: page, limit, order, direction_order, user, finished_by_user, person, connection, sector, reason, card, name, search, type, status, statuses, csat, populate, start_date, end_date, field_date, tags, sectors, fcr, win, key, custom_fields (extra keys allowed).
     */
    getHistoryByPermission(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; user?: string; finished_by_user?: string; person?: string; connection?: string; sector?: string; reason?: string; card?: string; name?: string; search?: string; type?: string; status?: string; statuses?: string; csat?: number; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; tags?: string[]; sectors?: string[]; fcr?: boolean; win?: boolean; key?: string; custom_fields?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}/history-by-permission', { path: { id }, query: opts.query });
    }

    /**
     * Get services messages by id.
     * @method GET /v1/workspaces/{workspace_id}/services/{id}/messages
     * @remarks Documented query: page, limit, order, direction_order, user, body, populate, message (extra keys allowed).
     */
    ServicesController_getServicesMessages_v1(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; user?: string; body?: string; populate?: string[]; message?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}/messages', { path: { id }, query: opts.query });
    }

    /**
     * Create a message.
     * @method POST /v1/workspaces/{workspace_id}/services/{service_id}/messages
     * @remarks Any query params may be sent (none documented).
     */
    messagesV1(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/services/{service_id}/messages', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Create a message template.
     * @method POST /v1/workspaces/{workspace_id}/services/{service_id}/messages-templates
     * @remarks Any query params may be sent (none documented).
     */
    messagesTemplates(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/services/{service_id}/messages-templates', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Remove cards by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{service_id}/remove-cards
     * @remarks Any query params may be sent (none documented).
     */
    removeCards(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{service_id}/remove-cards', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Remove followers by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{service_id}/remove-followers
     * @remarks Any query params may be sent (none documented).
     */
    removeFollowers(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{service_id}/remove-followers', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Remove tags by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{service_id}/remove-tags
     * @remarks Any query params may be sent (none documented).
     */
    removeTags(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{service_id}/remove-tags', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Get service-times by id.
     * @method GET /v1/workspaces/{workspace_id}/services/{id}/service-times
     * @remarks Documented query: page, limit, order, direction_order, user, person, connection, sector, service, card, type, active, populate, start_date, end_date, field_date (extra keys allowed).
     */
    getServiceTimes(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; user?: string; person?: string; connection?: string; sector?: string; service?: string; card?: string; type?: string; active?: string; populate?: string[]; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}/service-times', { path: { id }, query: opts.query });
    }

    /**
     * Take service by id.
     * @method PATCH /v1/workspaces/{workspace_id}/services/{id}/take
     * @remarks Any query params may be sent (none documented).
     */
    patchTake(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/services/{id}/take', { path: { id }, body, query: opts.query });
    }

    /**
     * Transfer service by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{service_id}/transfer
     * @remarks Documented query: populate (extra keys allowed).
     */
    putTransfer(serviceId: string, body: Record<string, unknown>, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{service_id}/transfer', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Get service by id.
     * @method GET /v1/workspaces/{workspace_id}/services/{service_id}
     * @remarks Any query params may be sent (none documented).
     */
    getServiceV1(serviceId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{service_id}', { path: { service_id: serviceId }, query: opts.query });
    }

    /**
     * Update service by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{service_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateService(serviceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{service_id}', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Batch service actions.
     * @method POST /v1/workspaces/{workspace_id}/services/batch
     * @remarks Any query params may be sent (none documented).
     */
    batch(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/services/batch', { body, query: opts.query });
    }

    /**
     * Get all services.
     * @method GET /v1/workspaces/{workspace_id}/services
     * @remarks Documented query: page, limit, order, direction_order, user, finished_by_user, person, connection, sector, reason, card, name, search, type, status, statuses, csat, populate, start_date, end_date, field_date, tags, sectors, fcr, win, key, custom_fields (extra keys allowed).
     */
    listServicesV1(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; user?: string; finished_by_user?: string; person?: string; connection?: string; sector?: string; reason?: string; card?: string; name?: string; search?: string; type?: string; status?: string; statuses?: string; csat?: number; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; tags?: string[]; sectors?: string[]; fcr?: boolean; win?: boolean; key?: string; custom_fields?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/services', { query: opts.query });
    }

    /**
     * Create a new service.
     * @method POST /v1/workspaces/{workspace_id}/services
     * @remarks Any query params may be sent (none documented).
     */
    createService(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/services', { body, query: opts.query });
    }

    /**
     * messages. Create a message v2.
     * @method POST /v2/workspaces/{workspace_id}/services/{service_id}/messages
     * @remarks Any query params may be sent (none documented).
     * @param file The spreadsheet file part (sent under the `file` field).
     * @param fields Extra form-data text fields to send alongside the file.
     */
    messages(serviceId: string, file: MultipartFile, fields?: Record<string, string>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        const body: MultipartBody = { kind: 'multipart', fields, files: { file } };
        return this.http.post('/v2/workspaces/{workspace_id}/services/{service_id}/messages', { path: { service_id: serviceId }, body, query: opts.query });
    }

    /**
     * Get service by id (V2).
     * @method GET /v2/workspaces/{workspace_id}/services/{service_id}
     * @remarks Any query params may be sent (none documented).
     */
    getService(serviceId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v2/workspaces/{workspace_id}/services/{service_id}', { path: { service_id: serviceId }, query: opts.query });
    }

    /**
     * Get all services (V2).
     * @method GET /v2/workspaces/{workspace_id}/services
     * @remarks Documented query: filters, page, limit, order, direction_order, user, finished_by_user, person, connection, sector, reason, card, name, search, type, status, statuses, csat, populate, start_date, end_date, field_date, tags, sectors, fcr, win, key, custom_fields (extra keys allowed).
     */
    listServices(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; user?: string; finished_by_user?: string; person?: string; connection?: string; sector?: string; reason?: string; card?: string; name?: string; search?: string; type?: string; status?: string; statuses?: string; csat?: number; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; tags?: string[]; sectors?: string[]; fcr?: boolean; win?: boolean; key?: string; custom_fields?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v2/workspaces/{workspace_id}/services', { query: opts.query });
    }
}
