import { Resource } from './base';
import type { Paged } from '../core/types';
import type { WorkspaceUser } from './gen_workspaces';

/** A sector. */
export interface Sector {
    id: string;
    name?: string;
    std_name?: string;
    description?: string;
    workspace?: string;
    color?: string;
    online_transfer?: boolean;
    available_transfer?: boolean;
    available_take?: boolean;
    keep_owner?: boolean;
    has_close_reason?: boolean;
    has_archive_reason?: boolean;
    has_user_transfer?: boolean;
    has_user_name?: boolean;
    mark_messages_as_read?: boolean;
    has_transfer_reason?: boolean;
    allow_transfer_sectors?: unknown;
    default?: boolean;
    created_at?: string;
    updated_at?: string;
    transfer_algorithm?: unknown;
    workspace_id?: string;
    sla_config_id?: unknown;
    office_hours_id?: unknown;
    [key: string]: unknown;
}

/** `sectors` resource (generated from openapi.json). */
export class Sectors extends Resource {
    /**
     * Remove user from sector by id.
     * @method DELETE /v1/workspaces/{workspace_id}/sectors/{id}/sectors-users/{sector_user_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSectorsUsers(id: string, sectorUserId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/sectors/{id}/sectors-users/{sector_user_id}', { path: { id, sector_user_id: sectorUserId }, query: opts.query });
    }

    /**
     * Update sector users.
     * @method PUT /v1/workspaces/{workspace_id}/sectors/{id}/sectors-users/{sector_user_id}
     * @remarks Any query params may be sent (none documented).
     */
    putSectorsUsers(id: string, sectorUserId: string, body: Partial<Sector>, opts: { query?: Record<string, unknown> } = {}): Promise<Sector> {
        return this.http.put('/v1/workspaces/{workspace_id}/sectors/{id}/sectors-users/{sector_user_id}', { path: { id, sector_user_id: sectorUserId }, body, query: opts.query });
    }

    /**
     * Get all users from sector by id.
     * @method GET /v1/workspaces/{workspace_id}/sectors/{id}/sectors-users
     * @remarks Documented query: filters, page, limit, order, direction_order, name, email, is_attendant, role_type (extra keys allowed).
     * @remarks Returns the users that belong to the sector, not sectors.
     */
    getSectorsUsers(id: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; email?: string; is_attendant?: boolean; role_type?: string } & Record<string, unknown> } = {}): Promise<Paged<WorkspaceUser>> {
        return this.http.get('/v1/workspaces/{workspace_id}/sectors/{id}/sectors-users', { path: { id }, query: opts.query });
    }

    /**
     * Add user to sector by id.
     * @method POST /v1/workspaces/{workspace_id}/sectors/{id}/sectors-users
     * @remarks Documented query: users (extra keys allowed).
     */
    sectorsUsers(id: string, body: Partial<Sector>, opts: { query?: { users?: string } & Record<string, unknown> } = {}): Promise<Sector> {
        return this.http.post('/v1/workspaces/{workspace_id}/sectors/{id}/sectors-users', { path: { id }, body, query: opts.query });
    }

    /**
     * W.I.P.
     * @method DELETE /v1/workspaces/{workspace_id}/sectors/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSector(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/sectors/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Get sector by id.
     * @method GET /v1/workspaces/{workspace_id}/sectors/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getSector(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<Sector> {
        return this.http.get('/v1/workspaces/{workspace_id}/sectors/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Update sector by id.
     * @method PUT /v1/workspaces/{workspace_id}/sectors/{id}
     * @remarks Any query params may be sent (none documented).
     */
    updateSector(id: string, body: Partial<Sector>, opts: { query?: Record<string, unknown> } = {}): Promise<Sector> {
        return this.http.put('/v1/workspaces/{workspace_id}/sectors/{id}', { path: { id }, body, query: opts.query });
    }

    /**
     * Get default sector.
     * @method GET /v1/workspaces/{workspace_id}/sectors/default-sector
     * @remarks Any query params may be sent (none documented).
     */
    getDefaultSector(opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Sector>> {
        return this.http.get('/v1/workspaces/{workspace_id}/sectors/default-sector', { query: opts.query });
    }

    /**
     * Get all sectors by user permission target.
     * @method GET /v1/workspaces/{workspace_id}/sectors/user/permission-target
     * @remarks Documented query: filters, page, limit, order, direction_order, name, permission_target (extra keys allowed).
     */
    getPermissionTarget(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; permission_target?: string } & Record<string, unknown> } = {}): Promise<Paged<Sector>> {
        return this.http.get('/v1/workspaces/{workspace_id}/sectors/user/permission-target', { query: opts.query });
    }

    /**
     * Get all sectors by user.
     * @method GET /v1/workspaces/{workspace_id}/sectors/user
     * @remarks Documented query: filters, sector (extra keys allowed).
     * @remarks Returns the sectors the current user belongs to (not users), hence {@link Sector}.
     */
    getUser(opts: { query?: { filters?: string; sector?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Sector>> {
        return this.http.get('/v1/workspaces/{workspace_id}/sectors/user', { query: opts.query });
    }

    /**
     * Get all sectors by user id.
     * @method GET /v1/workspaces/{workspace_id}/sectors/users/{user_id}
     * @remarks Documented query: filters, sector (extra keys allowed).
     * @remarks Returns the sectors the given user belongs to (not the user), hence {@link Sector}.
     *          The API has no get-user-by-id route — resolve a user via the workspace member list.
     */
    getUserById(userId: string, opts: { query?: { filters?: string; sector?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Sector>> {
        return this.http.get('/v1/workspaces/{workspace_id}/sectors/users/{user_id}', { path: { user_id: userId }, query: opts.query });
    }

    /**
     * listUsers.
     * @method GET /v1/workspaces/{workspace_id}/sectors/users
     * @remarks Any query params may be sent (none documented).
     * @remarks Returns workspace users (the `/sectors/users` collection), not sectors.
     */
    listUsers(opts: { query?: Record<string, unknown> } = {}): Promise<Paged<WorkspaceUser>> {
        return this.http.get('/v1/workspaces/{workspace_id}/sectors/users', { query: opts.query });
    }

    /**
     * Get all sectors.
     * @method GET /v1/workspaces/{workspace_id}/sectors
     * @remarks Documented query: filters, page, limit, order, direction_order, name, reduced, users_count, populate (extra keys allowed).
     */
    listSectors(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; reduced?: boolean; users_count?: boolean; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Sector>> {
        return this.http.get('/v1/workspaces/{workspace_id}/sectors', { query: opts.query });
    }

    /**
     * Create a new sector.
     * @method POST /v1/workspaces/{workspace_id}/sectors
     * @remarks Any query params may be sent (none documented).
     */
    createSector(body: Partial<Sector>, opts: { query?: Record<string, unknown> } = {}): Promise<Sector> {
        return this.http.post('/v1/workspaces/{workspace_id}/sectors', { body, query: opts.query });
    }
}
