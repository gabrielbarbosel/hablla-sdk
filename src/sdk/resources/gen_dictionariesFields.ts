import { Resource } from './base';

/** `dictionaries-fields` resource (generated from openapi.json). */
export class DictionariesFields extends Resource {
    /**
     * listDictionariesFields.
     * @method GET /v1/workspaces/{workspace_id}/dictionaries-fields
     * @remarks Documented query: filters (extra keys allowed).
     */
    listDictionariesFields(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/dictionaries-fields', { query: opts.query });
    }
}
