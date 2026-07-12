import { Resource } from './base';

/** `distribution-logs` resource (generated from openapi.json). */
export class DistributionLogs extends Resource {
    /**
     * Get next distribution.
     * @method GET /v1/workspaces/{workspace_id}/distribution-logs/next-distribution
     * @remarks Any query params may be sent (none documented).
     */
    getNextDistribution(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/distribution-logs/next-distribution', { query: opts.query });
    }
}
