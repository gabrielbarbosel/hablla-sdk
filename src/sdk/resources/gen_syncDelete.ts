import { Resource } from './base';

/** `sync-delete` resource (generated from openapi.json). */
export class SyncDelete extends Resource {
    /**
     * listSyncDelete.
     * @method GET /v1/workspaces/{workspace_id}/sync-delete
     * @remarks Documented query: filters (extra keys allowed).
     */
    listSyncDelete(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/sync-delete', { query: opts.query });
    }
}
