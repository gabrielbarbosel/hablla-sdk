import { Resource } from './base';

/** `triggers` resource (generated from openapi.json). */
export class Triggers extends Resource {
    /**
     * getTrigger.
     * @method GET /v1/workspaces/{workspace_id}/triggers/{trigger_id}
     * @remarks Any query params may be sent (none documented).
     */
    getTrigger(triggerId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/triggers/{trigger_id}', { path: { trigger_id: triggerId }, query: opts.query });
    }

    /**
     * listTriggers.
     * @method GET /v1/workspaces/{workspace_id}/triggers
     * @remarks Documented query: filters (extra keys allowed).
     */
    listTriggers(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/triggers', { query: opts.query });
    }
}
