import { Resource } from './base';

/** `partnered` resource (generated from openapi.json). */
export class Partnered extends Resource {
    /**
     * listPartnered.
     * @method GET /v1/workspaces/{workspace_id}/partnered
     * @remarks Documented query: filters (extra keys allowed).
     */
    listPartnered(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/partnered', { query: opts.query });
    }
}
