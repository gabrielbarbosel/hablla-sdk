import { Resource } from './base';
import type { Paged } from '../core/types';

/** A service (support/attendance ticket). */
export interface Service {
    id: string;
    name?: string;
    type?: string;
    status?: string;
    key?: string;
    workspace?: string;
    connection?: string;
    person?: string;
    sector?: string;
    session?: string;
    followers?: unknown;
    sla_config?: unknown;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    person_id?: string;
    user_id?: unknown;
    sector_id?: string;
    connection_id?: string;
    reason_id?: unknown;
    tags?: unknown;
    [key: string]: unknown;
}

/** `services` resource (generated from openapi.json). */
export class Services extends Resource {
    /**
     * Do action on service by id.
     * @method PATCH /v1/workspaces/{workspace_id}/services/{id}/action
     * @remarks Any query params may be sent (none documented).
     */
    patchAction(id: string, body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.patch('/v1/workspaces/{workspace_id}/services/{id}/action', { path: { id }, body, query: opts.query });
    }

    /**
     * Add cards on service by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{id}/add-cards
     * @remarks Any query params may be sent (none documented).
     */
    addCards(id: string, body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{id}/add-cards', { path: { id }, body, query: opts.query });
    }

    /**
     * Add followers to service by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{id}/add-followers
     * @remarks Any query params may be sent (none documented).
     */
    addFollowers(id: string, body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{id}/add-followers', { path: { id }, body, query: opts.query });
    }

    /**
     * Add tags on service by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{id}/add-tags
     * @remarks Any query params may be sent (none documented).
     */
    addTags(id: string, body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{id}/add-tags', { path: { id }, body, query: opts.query });
    }

    /**
     * Create or associate a person with a service.
     * @method POST /v1/workspaces/{workspace_id}/services/{id}/associate
     * @remarks Any query params may be sent (none documented).
     */
    associate(id: string, body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.post('/v1/workspaces/{workspace_id}/services/{id}/associate', { path: { id }, body, query: opts.query });
    }

    /**
     * Get all messages by service and connection.
     * @method GET /v1/workspaces/{workspace_id}/services/{id}/connection/{connection_id}/messages
     * @remarks Documented query: filters, page, limit, order, direction_order, user, body, type, key, populate, message, media_only (extra keys allowed).
     */
    listConnectionMessages(id: string, connectionId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; user?: string; body?: string; type?: string; key?: string; populate?: string[]; message?: string; media_only?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Service>> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}/connection/{connection_id}/messages', { path: { id, connection_id: connectionId }, query: opts.query });
    }

    /**
     * Update custom-fields on service by id.
     * @method PATCH /v1/workspaces/{workspace_id}/services/{id}/custom-fields
     * @remarks Any query params may be sent (none documented).
     */
    patchCustomFields(id: string, body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.patch('/v1/workspaces/{workspace_id}/services/{id}/custom-fields', { path: { id }, body, query: opts.query });
    }

    /**
     * Get emails from services by id.
     * @method GET /v1/workspaces/{workspace_id}/services/{id}/emails
     * @remarks Documented query: page, limit, order, direction_order, to, subject, text, user, person, service, populate (extra keys allowed).
     */
    getEmails(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; to?: string; subject?: string; text?: string; user?: string; person?: string; service?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Service>> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}/emails', { path: { id }, query: opts.query });
    }

    /**
     * Get all services by permission.
     * @method GET /v1/workspaces/{workspace_id}/services/{id}/history-by-permission
     * @remarks Documented query: page, limit, order, direction_order, user, finished_by_user, person, connection, sector, reason, card, name, search, type, status, statuses, csat, populate, start_date, end_date, field_date, tags, sectors, fcr, win, key, custom_fields (extra keys allowed).
     */
    getHistoryByPermission(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; user?: string; finished_by_user?: string; person?: string; connection?: string; sector?: string; reason?: string; card?: string; name?: string; search?: string; type?: string; status?: string; statuses?: string; csat?: number; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; tags?: string[]; sectors?: string[]; fcr?: boolean; win?: boolean; key?: string; custom_fields?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Service>> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}/history-by-permission', { path: { id }, query: opts.query });
    }

    /**
     * Get history (countless).
     * @method GET /v1/workspaces/{workspace_id}/services/{id}/history
     * @remarks Documented query: page, limit, order, retrieve_mode, direction_order, user, finished_by_user, person, connection, sector, reason, card, name, search, type, status, statuses, csat, populate, start_date, end_date, field_date, tags, sectors, fcr, win, key (extra keys allowed).
     */
    getHistory(id: string, opts: { query?: { page?: string; limit?: number; order?: string; retrieve_mode?: string; direction_order?: string; user?: string; finished_by_user?: string; person?: string; connection?: string; sector?: string; reason?: string; card?: string; name?: string; search?: string; type?: string; status?: string; statuses?: string; csat?: number; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; tags?: string[]; sectors?: string[]; fcr?: boolean; win?: boolean; key?: string } & Record<string, unknown> } = {}): Promise<Paged<Service>> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}/history', { path: { id }, query: opts.query });
    }

    /**
     * Get services messages by id.
     * @method GET /v1/workspaces/{workspace_id}/services/{id}/messages
     * @remarks Documented query: page, limit, order, direction_order, user, body, populate, message (extra keys allowed).
     */
    listMessages(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; user?: string; body?: string; populate?: string[]; message?: string } & Record<string, unknown> } = {}): Promise<Paged<Service>> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}/messages', { path: { id }, query: opts.query });
    }

    /**
     * Remove cards by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{id}/remove-cards
     * @remarks Any query params may be sent (none documented).
     */
    removeCards(id: string, body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{id}/remove-cards', { path: { id }, body, query: opts.query });
    }

    /**
     * Remove followers by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{id}/remove-followers
     * @remarks Any query params may be sent (none documented).
     */
    removeFollowers(id: string, body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{id}/remove-followers', { path: { id }, body, query: opts.query });
    }

    /**
     * Remove tags by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{id}/remove-tags
     * @remarks Any query params may be sent (none documented).
     */
    removeTags(id: string, body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{id}/remove-tags', { path: { id }, body, query: opts.query });
    }

    /**
     * Get service-times by id.
     * @method GET /v1/workspaces/{workspace_id}/services/{id}/service-times
     * @remarks Documented query: page, limit, order, direction_order, user, person, connection, sector, service, card, type, active, populate, start_date, end_date, field_date (extra keys allowed).
     */
    getServiceTimes(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; user?: string; person?: string; connection?: string; sector?: string; service?: string; card?: string; type?: string; active?: string; populate?: string[]; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<Paged<Service>> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}/service-times', { path: { id }, query: opts.query });
    }

    /**
     * Take service by id.
     * @method PATCH /v1/workspaces/{workspace_id}/services/{id}/take
     * @remarks Any query params may be sent (none documented).
     */
    patchTake(id: string, body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.patch('/v1/workspaces/{workspace_id}/services/{id}/take', { path: { id }, body, query: opts.query });
    }

    /**
     * Transfer service by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{id}/transfer
     * @remarks Documented query: populate (extra keys allowed).
     */
    putTransfer(id: string, body: Partial<Service>, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Service> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{id}/transfer', { path: { id }, body, query: opts.query });
    }

    /**
     * Get service by id.
     * @method GET /v1/workspaces/{workspace_id}/services/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getServiceV1(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.get('/v1/workspaces/{workspace_id}/services/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Update service by id.
     * @method PUT /v1/workspaces/{workspace_id}/services/{id}
     * @remarks Any query params may be sent (none documented).
     */
    updateService(id: string, body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.put('/v1/workspaces/{workspace_id}/services/{id}', { path: { id }, body, query: opts.query });
    }

    /**
     * Batch service actions.
     * @method POST /v1/workspaces/{workspace_id}/services/batch
     * @remarks Any query params may be sent (none documented).
     */
    batch(body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.post('/v1/workspaces/{workspace_id}/services/batch', { body, query: opts.query });
    }

    /**
     * Get all services.
     * @method GET /v1/workspaces/{workspace_id}/services
     * @remarks Documented query: page, limit, order, direction_order, user, finished_by_user, person, connection, sector, reason, card, name, search, type, status, statuses, csat, populate, start_date, end_date, field_date, tags, sectors, fcr, win, key, custom_fields (extra keys allowed).
     */
    listServicesV1(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; user?: string; finished_by_user?: string; person?: string; connection?: string; sector?: string; reason?: string; card?: string; name?: string; search?: string; type?: string; status?: string; statuses?: string; csat?: number; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; tags?: string[]; sectors?: string[]; fcr?: boolean; win?: boolean; key?: string; custom_fields?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Service>> {
        return this.http.get('/v1/workspaces/{workspace_id}/services', { query: opts.query });
    }

    /**
     * Create a new service.
     * @method POST /v1/workspaces/{workspace_id}/services
     * @remarks Any query params may be sent (none documented).
     */
    createService(body: Partial<Service>, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.post('/v1/workspaces/{workspace_id}/services', { body, query: opts.query });
    }

    /**
     * Get service by id (V2).
     * @method GET /v2/workspaces/{workspace_id}/services/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getService(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<Service> {
        return this.http.get('/v2/workspaces/{workspace_id}/services/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Get all services (V2).
     * @method GET /v2/workspaces/{workspace_id}/services
     * @remarks Documented query: filters, page, limit, order, direction_order, user, finished_by_user, person, connection, sector, reason, card, name, search, type, status, statuses, csat, populate, start_date, end_date, field_date, tags, sectors, fcr, win, key, custom_fields (extra keys allowed).
     */
    listServices(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; user?: string; finished_by_user?: string; person?: string; connection?: string; sector?: string; reason?: string; card?: string; name?: string; search?: string; type?: string; status?: string; statuses?: string; csat?: number; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; tags?: string[]; sectors?: string[]; fcr?: boolean; win?: boolean; key?: string; custom_fields?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Service>> {
        return this.http.get('/v2/workspaces/{workspace_id}/services', { query: opts.query });
    }
}
