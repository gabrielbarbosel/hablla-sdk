import { Resource } from './base';

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
     * deleteRoot.
     * @method DELETE /v1/workspaces/{workspace_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteRoot(opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}', { query: opts.query });
    }

    /**
     * updateRoot.
     * @method PUT /v1/workspaces/{workspace_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateRoot(body: Partial<Root>, opts: { query?: Record<string, unknown> } = {}): Promise<Root> {
        return this.http.put('/v1/workspaces/{workspace_id}', { body, query: opts.query });
    }

    /**
     * createRoot.
     * @method POST /v1/workspaces
     * @remarks Any query params may be sent (none documented).
     */
    createRoot(body: Partial<Root>, opts: { query?: Record<string, unknown> } = {}): Promise<Root> {
        return this.http.post('/v1/workspaces', { body, query: opts.query });
    }
}
