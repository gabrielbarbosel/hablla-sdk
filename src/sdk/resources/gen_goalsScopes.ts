import { Resource } from './base';

/** `goals-scopes` resource (generated from openapi.json). */
export class GoalsScopes extends Resource {
    /**
     * deleteGoalsScope.
     * @method DELETE /v1/workspaces/{workspace_id}/goals-scopes/{goals_scope_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteGoalsScope(goalsScopeId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/goals-scopes/{goals_scope_id}', { path: { goals_scope_id: goalsScopeId }, query: opts.query });
    }

    /**
     * updateGoalsScope.
     * @method PUT /v1/workspaces/{workspace_id}/goals-scopes/{goals_scope_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateGoalsScope(goalsScopeId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/goals-scopes/{goals_scope_id}', { path: { goals_scope_id: goalsScopeId }, body, query: opts.query });
    }

    /**
     * listGoalsScopes.
     * @method GET /v1/workspaces/{workspace_id}/goals-scopes
     * @remarks Documented query: filters (extra keys allowed).
     */
    listGoalsScopes(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/goals-scopes', { query: opts.query });
    }

    /**
     * createGoalsScope.
     * @method POST /v1/workspaces/{workspace_id}/goals-scopes
     * @remarks Any query params may be sent (none documented).
     */
    createGoalsScope(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/goals-scopes', { body, query: opts.query });
    }
}
