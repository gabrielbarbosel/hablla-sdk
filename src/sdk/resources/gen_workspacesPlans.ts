import { Resource } from './base';

/** `workspaces-plans` resource (generated from openapi.json). */
export class WorkspacesPlans extends Resource {
    /**
     * deleteItems.
     * @method DELETE /v1/workspaces/{workspace_id}/workspaces-plans/items/{item_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteItems(itemId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/workspaces-plans/items/{item_id}', { path: { item_id: itemId }, query: opts.query });
    }

    /**
     * getWorkspacesPlan.
     * @method GET /v1/workspaces/{workspace_id}/workspaces-plans/{workspaces_plan_id}
     * @remarks Any query params may be sent (none documented).
     */
    getWorkspacesPlan(workspacesPlanId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/workspaces-plans/{workspaces_plan_id}', { path: { workspaces_plan_id: workspacesPlanId }, query: opts.query });
    }

    /**
     * updateWorkspacesPlan.
     * @method PUT /v1/workspaces/{workspace_id}/workspaces-plans/{workspaces_plan_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateWorkspacesPlan(workspacesPlanId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/workspaces-plans/{workspaces_plan_id}', { path: { workspaces_plan_id: workspacesPlanId }, body, query: opts.query });
    }

    /**
     * putAdditionalItems.
     * @method PUT /v1/workspaces/{workspace_id}/workspaces-plans/additional-items
     * @remarks Any query params may be sent (none documented).
     */
    putAdditionalItems(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/workspaces-plans/additional-items', { body, query: opts.query });
    }

    /**
     * patchItems.
     * @method PATCH /v1/workspaces/{workspace_id}/workspaces-plans/items
     * @remarks Any query params may be sent (none documented).
     */
    patchItems(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/workspaces-plans/items', { body, query: opts.query });
    }

    /**
     * listWorkspacesPlans.
     * @method GET /v1/workspaces/{workspace_id}/workspaces-plans
     * @remarks Documented query: filters (extra keys allowed).
     */
    listWorkspacesPlans(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/workspaces-plans', { query: opts.query });
    }
}
