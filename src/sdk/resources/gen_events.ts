import { Resource } from './base';

/** `events` resource (generated from openapi.json). */
export class Events extends Resource {
    /**
     * Get event by id.
     * @method GET /v1/workspaces/{workspace_id}/events/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getEvent(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/events/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Get all events.
     * @method GET /v1/workspaces/{workspace_id}/events
     * @remarks Documented query: filters, page, limit, order, direction_order, person, user, service, card, organization, start_date, end_date, populate, event_type (extra keys allowed).
     */
    listEvents(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; person?: string; user?: string; service?: string; card?: string; organization?: string; start_date?: string; end_date?: string; populate?: string[]; event_type?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/events', { query: opts.query });
    }

    /**
     * Create a event.
     * @method POST /v1/workspaces/{workspace_id}/events
     * @remarks Any query params may be sent (none documented).
     */
    createEvent(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/events', { body, query: opts.query });
    }
}
