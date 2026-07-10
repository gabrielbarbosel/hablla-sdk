import { Resource } from './base';

/** `plans` resource (generated from openapi.json). */
export class Plans extends Resource {
    /**
     * deletePlan.
     * @method DELETE /v1/plans/{plan_id}
     * @remarks Any query params may be sent (none documented).
     */
    deletePlan(planId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/plans/{plan_id}', { path: { plan_id: planId }, query: opts.query });
    }

    /**
     * getPlan.
     * @method GET /v1/plans/{plan_id}
     * @remarks Any query params may be sent (none documented).
     */
    getPlan(planId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/plans/{plan_id}', { path: { plan_id: planId }, query: opts.query });
    }

    /**
     * updatePlan.
     * @method PUT /v1/plans/{plan_id}
     * @remarks Any query params may be sent (none documented).
     */
    updatePlan(planId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/plans/{plan_id}', { path: { plan_id: planId }, body, query: opts.query });
    }

    /**
     * listPlans.
     * @method GET /v1/plans
     * @remarks Documented query: filters (extra keys allowed).
     */
    listPlans(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/plans', { query: opts.query });
    }

    /**
     * createPlan.
     * @method POST /v1/plans
     * @remarks Any query params may be sent (none documented).
     */
    createPlan(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/plans', { body, query: opts.query });
    }

    /**
     * patchActivate.
     * @method PATCH /v1/workspaces/{workspace_id}/plans/activate
     * @remarks Any query params may be sent (none documented).
     */
    patchActivate(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/plans/activate', { body, query: opts.query });
    }

    /**
     * getSubscribe.
     * @method GET /v1/workspaces/{workspace_id}/plans/subscribe
     * @remarks Any query params may be sent (none documented).
     */
    getSubscribe(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/plans/subscribe', { query: opts.query });
    }

    /**
     * deleteUnsubscribe.
     * @method DELETE /v1/workspaces/{workspace_id}/plans/unsubscribe
     * @remarks Any query params may be sent (none documented).
     */
    deleteUnsubscribe(opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/plans/unsubscribe', { query: opts.query });
    }
}
