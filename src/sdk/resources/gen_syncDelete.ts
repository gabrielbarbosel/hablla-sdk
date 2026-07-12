import { Resource } from './base';
import type { Paged } from '../core/types';

/** A sync-delete record (tracks deleted objects for synchronization). */
export interface SyncDeleteRecord {
    id: string;
    workspace?: string;
    table?: string;
    object_id?: string;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    [key: string]: unknown;
}

/** `sync-delete` resource (generated from openapi.json). */
export class SyncDelete extends Resource {
    /**
     * listSyncDelete.
     * @method GET /v1/workspaces/{workspace_id}/sync-delete
     * @remarks Documented query: filters (extra keys allowed).
     */
    listSyncDelete(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<SyncDeleteRecord>> {
        return this.http.get('/v1/workspaces/{workspace_id}/sync-delete', { query: opts.query });
    }
}
