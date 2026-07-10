import { Resource } from './base';

/** `hablla-reports` resource (generated from openapi.json). */
export class HabllaReports extends Resource {
    /**
     * getMonthlySessionsTotals.
     * @method GET /v1/workspaces/hablla-reports/reports/alloy-reports/admin/monthly-sessions-totals
     * @remarks Documented query: filters (extra keys allowed).
     */
    getMonthlySessionsTotals(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/hablla-reports/reports/alloy-reports/admin/monthly-sessions-totals', { query: opts.query });
    }
}
