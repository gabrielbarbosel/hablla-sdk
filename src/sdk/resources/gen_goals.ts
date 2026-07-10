import { Resource } from './base';

/** `goals` resource (generated from openapi.json). */
export class Goals extends Resource {
    /**
     * deleteGoal.
     * @method DELETE /v1/workspaces/{workspace_id}/goals/{goal_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteGoal(goalId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/goals/{goal_id}', { path: { goal_id: goalId }, query: opts.query });
    }

    /**
     * getGoal.
     * @method GET /v1/workspaces/{workspace_id}/goals/{goal_id}
     * @remarks Any query params may be sent (none documented).
     */
    getGoal(goalId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/goals/{goal_id}', { path: { goal_id: goalId }, query: opts.query });
    }

    /**
     * updateGoal.
     * @method PUT /v1/workspaces/{workspace_id}/goals/{goal_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateGoal(goalId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/goals/{goal_id}', { path: { goal_id: goalId }, body, query: opts.query });
    }

    /**
     * listGoals.
     * @method GET /v1/workspaces/{workspace_id}/goals
     * @remarks Documented query: filters (extra keys allowed).
     */
    listGoals(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/goals', { query: opts.query });
    }

    /**
     * createGoal.
     * @method POST /v1/workspaces/{workspace_id}/goals
     * @remarks Any query params may be sent (none documented).
     */
    createGoal(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/goals', { body, query: opts.query });
    }
}
