import { Resource } from './base';
import type { Paged } from '../core/types';

/** A permission profile. */
export interface Permission {
    id: string;
    name?: string;
    std_name?: string;
    description?: string;
    workspace?: string;
    persons_permissions?: unknown;
    services_permissions?: unknown;
    cards_permissions?: unknown;
    organizations_permissions?: unknown;
    internal_chat_permissions?: unknown;
    tasks_permissions?: unknown;
    post_feed_permissions?: unknown;
    menu_permissions?: unknown;
    bulk_messaging_config?: unknown;
    services_config?: unknown;
    block_access_on_shift_end?: boolean;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

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
    getPermission(permissionId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Permission> {
        return this.http.get('/v1/workspaces/{workspace_id}/permissions/{permission_id}', { path: { permission_id: permissionId }, query: opts.query });
    }

    /**
     * updatePermission.
     * @method PUT /v1/workspaces/{workspace_id}/permissions/{permission_id}
     * @remarks Any query params may be sent (none documented).
     */
    updatePermission(permissionId: string, body: Partial<Permission>, opts: { query?: Record<string, unknown> } = {}): Promise<Permission> {
        return this.http.put('/v1/workspaces/{workspace_id}/permissions/{permission_id}', { path: { permission_id: permissionId }, body, query: opts.query });
    }

    /**
     * listPermissions.
     * @method GET /v1/workspaces/{workspace_id}/permissions
     * @remarks Documented query: filters (extra keys allowed).
     */
    listPermissions(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Permission>> {
        return this.http.get('/v1/workspaces/{workspace_id}/permissions', { query: opts.query });
    }

    /**
     * createPermission.
     * @method POST /v1/workspaces/{workspace_id}/permissions
     * @remarks Any query params may be sent (none documented).
     */
    createPermission(body: Partial<Permission>, opts: { query?: Record<string, unknown> } = {}): Promise<Permission> {
        return this.http.post('/v1/workspaces/{workspace_id}/permissions', { body, query: opts.query });
    }

    /**
     * updatePermissions.
     * @method PUT /v1/workspaces/{workspace_id}/permissions
     * @remarks Any query params may be sent (none documented).
     */
    updatePermissions(body: Partial<Permission>, opts: { query?: Record<string, unknown> } = {}): Promise<Permission> {
        return this.http.put('/v1/workspaces/{workspace_id}/permissions', { body, query: opts.query });
    }
}
