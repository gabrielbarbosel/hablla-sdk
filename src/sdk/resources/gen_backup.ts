import { Resource } from './base';

/** `backup` resource (generated from openapi.json). */
export class Backup extends Resource {
    /**
     * createBackup.
     * @method POST /v1/workspaces/{workspace_id}/backup
     * @remarks Any query params may be sent (none documented).
     */
    createBackup(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/backup', { body, query: opts.query });
    }
}
