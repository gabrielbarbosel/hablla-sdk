import { Resource } from './base';

/** `permissions` resource (generated from openapi.json). */
export class Permissions extends Resource {
    /**
     * deletePermission.
     * @method DELETE /v1/workspaces/{workspace_id}/permissions/{permission_id}
     * @remarks Any query params may be sent (none documented).
     */
    deletePermission(permissionId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/permissions/{permission_id}', { path: { permission_id: permissionId }, query: opts.query });
    }

    /**
     * getPermission.
     * @method GET /v1/workspaces/{workspace_id}/permissions/{permission_id}
     * @remarks Any query params may be sent (none documented).
     */
    getPermission(permissionId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/permissions/{permission_id}', { path: { permission_id: permissionId }, query: opts.query });
    }

    /**
     * updatePermission.
     * @method PUT /v1/workspaces/{workspace_id}/permissions/{permission_id}
     * @remarks Any query params may be sent (none documented).
     */
    updatePermission(permissionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/permissions/{permission_id}', { path: { permission_id: permissionId }, body, query: opts.query });
    }

    /**
     * listPermissions.
     * @method GET /v1/workspaces/{workspace_id}/permissions
     * @remarks Documented query: filters (extra keys allowed).
     */
    listPermissions(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/permissions', { query: opts.query });
    }

    /**
     * createPermission.
     * @method POST /v1/workspaces/{workspace_id}/permissions
     * @remarks Any query params may be sent (none documented).
     */
    createPermission(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/permissions', { body, query: opts.query });
    }

    /**
     * updateWorkspacePermissions.
     * @method PUT /v1/workspaces/{workspace_id}/permissions
     * @remarks Any query params may be sent (none documented).
     */
    updateWorkspacePermissions(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/permissions', { body, query: opts.query });
    }
}
