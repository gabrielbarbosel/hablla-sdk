import { Resource } from './base';
import type { Paged } from '../core/types';

/** An office-hours configuration. */
export interface OfficeHour {
    id: string;
    workspace?: string;
    name?: string;
    std_name?: string;
    office_hours?: unknown;
    timezone?: unknown;
    emit_events?: boolean;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    [key: string]: unknown;
}

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
    getOfficeHour(officeHourId: string, opts: { query?: Record<string, unknown> } = {}): Promise<OfficeHour> {
        return this.http.get('/v1/workspaces/{workspace_id}/office-hours/{office_hour_id}', { path: { office_hour_id: officeHourId }, query: opts.query });
    }

    /**
     * updateOfficeHour.
     * @method PUT /v1/workspaces/{workspace_id}/office-hours/{office_hour_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateOfficeHour(officeHourId: string, body: Partial<OfficeHour>, opts: { query?: Record<string, unknown> } = {}): Promise<OfficeHour> {
        return this.http.put('/v1/workspaces/{workspace_id}/office-hours/{office_hour_id}', { path: { office_hour_id: officeHourId }, body, query: opts.query });
    }

    /**
     * listOfficeHours.
     * @method GET /v1/workspaces/{workspace_id}/office-hours
     * @remarks Documented query: filters (extra keys allowed).
     */
    listOfficeHours(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<OfficeHour>> {
        return this.http.get('/v1/workspaces/{workspace_id}/office-hours', { query: opts.query });
    }

    /**
     * createOfficeHour.
     * @method POST /v1/workspaces/{workspace_id}/office-hours
     * @remarks Any query params may be sent (none documented).
     */
    createOfficeHour(body: Partial<OfficeHour>, opts: { query?: Record<string, unknown> } = {}): Promise<OfficeHour> {
        return this.http.post('/v1/workspaces/{workspace_id}/office-hours', { body, query: opts.query });
    }
}
