import { Resource } from './base';
import type { Paged } from '../core/types';

/** A workspace (root entity). */
export interface Root {
    id: string;
    name?: string;
    std_name?: string;
    owner?: string;
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
    created_at?: string;
    updated_at?: string;
    current_plan?: string;
    pending_plan?: unknown;
    last_recount_sync?: string;
    organization?: string;
    photo_url?: string;
    url?: string;
    external_db?: string;
    prefix?: string;
    owner_id?: string;
    [key: string]: unknown;
}

/** `root` resource (generated from openapi.json). */
export class Root extends Resource {
    /**
     * Get all workspaces.
     * @method GET /v1/workspaces
     * @remarks Documented query: filters, page, limit, order, direction_order, name, search, type, plan_type, owner, partner, is_blocked, is_deleted, pending_plan, auto_invoice, created_at, updated_at (extra keys allowed).
     */
    getWorkspaces(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; search?: string; type?: string; plan_type?: string; owner?: string; partner?: string; is_blocked?: boolean; is_deleted?: boolean; pending_plan?: boolean; auto_invoice?: boolean; created_at?: unknown; updated_at?: unknown } & Record<string, unknown> } = {}): Promise<Paged<Root>> {
        return this.http.get('/v1/workspaces', { query: opts.query });
    }

    /**
     * workspaces.
     * @method POST /v1/workspaces
     * @remarks Any query params may be sent (none documented).
     */
    workspaces(body: Partial<Root>, opts: { query?: Record<string, unknown> } = {}): Promise<Root> {
        return this.http.post('/v1/workspaces', { body, query: opts.query });
    }

    /**
     * deleteRoot.
     * @method DELETE /v1/workspaces/{workspace_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteRoot(opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}', { query: opts.query });
    }

    /**
     * Get workspace by id.
     * @method GET /v1/workspaces/{workspace_id}
     * @remarks Any query params may be sent (none documented).
     */
    getRoot(opts: { query?: Record<string, unknown> } = {}): Promise<Root> {
        return this.http.get('/v1/workspaces/{workspace_id}', { query: opts.query });
    }

    /**
     * putRoot.
     * @method PUT /v1/workspaces/{workspace_id}
     * @remarks Any query params may be sent (none documented).
     */
    putRoot(body: Partial<Root>, opts: { query?: Record<string, unknown> } = {}): Promise<Root> {
        return this.http.put('/v1/workspaces/{workspace_id}', { body, query: opts.query });
    }
}
