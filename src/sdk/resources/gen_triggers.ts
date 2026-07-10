import { Resource } from './base';
import type { Paged } from '../core/types';

/** An automation trigger. */
export interface Trigger {
    id: string;
    is_hablla?: boolean;
    name?: string;
    std_name?: string;
    group_name?: string;
    description?: string;
    parameters?: unknown;
    integration_id?: unknown;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

/** `triggers` resource (generated from openapi.json). */
export class Triggers extends Resource {
    /**
     * getTrigger.
     * @method GET /v1/workspaces/{workspace_id}/triggers/{trigger_id}
     * @remarks Any query params may be sent (none documented).
     */
    getTrigger(triggerId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Trigger> {
        return this.http.get('/v1/workspaces/{workspace_id}/triggers/{trigger_id}', { path: { trigger_id: triggerId }, query: opts.query });
    }

    /**
     * listTriggers.
     * @method GET /v1/workspaces/{workspace_id}/triggers
     * @remarks Documented query: filters (extra keys allowed).
     */
    listTriggers(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Trigger>> {
        return this.http.get('/v1/workspaces/{workspace_id}/triggers', { query: opts.query });
    }
}
