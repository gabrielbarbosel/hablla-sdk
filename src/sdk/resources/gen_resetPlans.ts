import { Resource } from './base';

/** `reset-plans` resource (generated from openapi.json). */
export class ResetPlans extends Resource {
    /**
     * updateResetPlan.
     * @method PUT /v1/workspaces/{workspace_id}/reset-plans
     * @remarks Any query params may be sent (none documented).
     */
    updateResetPlan(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/reset-plans', { body, query: opts.query });
    }
}
