import { Resource } from './base';

/** `holidays` resource (generated from openapi.json). */
export class Holidays extends Resource {
    /**
     * Delete holiday by id.
     * @method DELETE /v1/workspaces/{workspace_id}/holidays/{holiday_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteHoliday(holidayId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/holidays/{holiday_id}', { path: { holiday_id: holidayId }, query: opts.query });
    }

    /**
     * Get holiday by id.
     * @method GET /v1/workspaces/{workspace_id}/holidays/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getHoliday(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/holidays/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Update holiday by id.
     * @method PUT /v1/workspaces/{workspace_id}/holidays/{holiday_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateHoliday(holidayId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/holidays/{holiday_id}', { path: { holiday_id: holidayId }, body, query: opts.query });
    }

    /**
     * Get holiday by filter.
     * @method GET /v1/workspaces/{workspace_id}/holidays/filter
     * @remarks Documented query: name, date, nameOrDate (extra keys allowed).
     */
    getFilter(opts: { query?: { name?: string; date?: string; nameOrDate?: unknown } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/holidays/filter', { query: opts.query });
    }

    /**
     * Get all holidays.
     * @method GET /v1/workspaces/{workspace_id}/holidays
     * @remarks Documented query: filters, page, limit, order, direction_order, name, date (extra keys allowed).
     */
    listHolidays(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; date?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/holidays', { query: opts.query });
    }

    /**
     * Create a new holiday.
     * @method POST /v1/workspaces/{workspace_id}/holidays
     * @remarks Any query params may be sent (none documented).
     */
    createHoliday(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/holidays', { body, query: opts.query });
    }
}
