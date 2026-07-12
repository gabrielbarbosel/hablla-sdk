import { Resource } from './base';

/** `office-hours` resource (generated from openapi.json). */
export class OfficeHours extends Resource {
    /**
     * deleteOfficeHour.
     * @method DELETE /v1/workspaces/{workspace_id}/office-hours/{office_hour_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteOfficeHour(officeHourId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/office-hours/{office_hour_id}', { path: { office_hour_id: officeHourId }, query: opts.query });
    }

    /**
     * getOfficeHour.
     * @method GET /v1/workspaces/{workspace_id}/office-hours/{office_hour_id}
     * @remarks Any query params may be sent (none documented).
     */
    getOfficeHour(officeHourId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/office-hours/{office_hour_id}', { path: { office_hour_id: officeHourId }, query: opts.query });
    }

    /**
     * updateOfficeHour.
     * @method PUT /v1/workspaces/{workspace_id}/office-hours/{office_hour_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateOfficeHour(officeHourId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/office-hours/{office_hour_id}', { path: { office_hour_id: officeHourId }, body, query: opts.query });
    }

    /**
     * listOfficeHours.
     * @method GET /v1/workspaces/{workspace_id}/office-hours
     * @remarks Documented query: filters (extra keys allowed).
     */
    listOfficeHours(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/office-hours', { query: opts.query });
    }

    /**
     * createOfficeHour.
     * @method POST /v1/workspaces/{workspace_id}/office-hours
     * @remarks Any query params may be sent (none documented).
     */
    createOfficeHour(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/office-hours', { body, query: opts.query });
    }
}
