import { Resource } from './base';

/** `search` resource (generated from openapi.json). */
export class Search extends Resource {
    /**
     * getPersonsWithOrganization.
     * @method GET /v1/workspaces/{workspace_id}/search/persons-with-organization
     * @remarks Documented query: filters (extra keys allowed).
     */
    getPersonsWithOrganization(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/search/persons-with-organization', { query: opts.query });
    }
}
