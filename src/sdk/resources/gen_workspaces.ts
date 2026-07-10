import { Resource } from './base';
import type { Paged } from '../core/types';

/** A workspace. */
export interface Workspace {
    id: string;
    name?: string;
    std_name?: string;
    owner?: string;
    owner_id?: string;
    type?: unknown;
    timezone?: unknown;
    currency_code?: string;
    date_format?: string;
    urls?: unknown;
    company_data?: unknown;
    private_chat_groups?: boolean;
    private_chat_between_users?: boolean;
    chat_between_users?: boolean;
    chat_between_workspaces?: boolean;
    token?: string;
    is_blocked?: boolean;
    service_queue_order?: string;
    is_deleted?: boolean;
    can_see_hablla_feed_posts?: boolean;
    can_see_feed_posts?: boolean;
    backups?: unknown;
    is_personal_usage?: boolean;
    enable_blocked_words?: boolean;
    use_hablla_block_list?: boolean;
    auto_invoice?: boolean;
    current_plan?: string;
    pending_plan?: unknown;
    last_recount_sync?: string;
    organization?: string;
    photo_url?: string;
    url?: string;
    external_db?: string;
    prefix?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

/** `workspaces` resource (generated from openapi.json). */
export class Workspaces extends Resource {
    /**
     * Get all users from a workspace by id.
     * @method GET /v1/workspaces/{workspace_id}/users
     * @remarks Documented query: filters, page, limit, order, direction_order, name, email, role_type, no_sector, no_person, no_service, permission, search, populate, start_date, end_date, field_date (extra keys allowed).
     */
    getUsers(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; email?: string; role_type?: string; no_sector?: string; no_person?: string; no_service?: string; permission?: string; search?: string; populate?: string[]; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<Paged<Workspace>> {
        return this.http.get('/v1/workspaces/{workspace_id}/users', { query: opts.query });
    }

    /**
     * Get workspace by id.
     * @method GET /v1/workspaces/{workspace_id}
     * @remarks Any query params may be sent (none documented).
     */
    getWorkspace(opts: { query?: Record<string, unknown> } = {}): Promise<Workspace> {
        return this.http.get('/v1/workspaces/{workspace_id}', { query: opts.query });
    }

    /**
     * Get all workspaces.
     * @method GET /v1/workspaces
     * @remarks Documented query: filters, page, limit, order, direction_order, name, search, type, plan_type, owner, partner, is_blocked, is_deleted, pending_plan, auto_invoice, created_at, updated_at (extra keys allowed).
     */
    listWorkspaces(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; search?: string; type?: string; plan_type?: string; owner?: string; partner?: string; is_blocked?: boolean; is_deleted?: boolean; pending_plan?: boolean; auto_invoice?: boolean; created_at?: unknown; updated_at?: unknown } & Record<string, unknown> } = {}): Promise<Paged<Workspace>> {
        return this.http.get('/v1/workspaces', { query: opts.query });
    }
}
