import { Resource } from './base';

/** `dictionaries` resource (generated from openapi.json). */
export class Dictionaries extends Resource {
    /**
     * deleteDictionary.
     * @method DELETE /v1/workspaces/{workspace_id}/dictionaries/{dictionary_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteDictionary(dictionaryId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/dictionaries/{dictionary_id}', { path: { dictionary_id: dictionaryId }, query: opts.query });
    }

    /**
     * getDictionary.
     * @method GET /v1/workspaces/{workspace_id}/dictionaries/{dictionary_id}
     * @remarks Any query params may be sent (none documented).
     */
    getDictionary(dictionaryId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/dictionaries/{dictionary_id}', { path: { dictionary_id: dictionaryId }, query: opts.query });
    }

    /**
     * updateDictionary.
     * @method PUT /v1/workspaces/{workspace_id}/dictionaries/{dictionary_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateDictionary(dictionaryId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/dictionaries/{dictionary_id}', { path: { dictionary_id: dictionaryId }, body, query: opts.query });
    }

    /**
     * listDictionaries.
     * @method GET /v1/workspaces/{workspace_id}/dictionaries
     * @remarks Documented query: filters (extra keys allowed).
     */
    listDictionaries(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/dictionaries', { query: opts.query });
    }

    /**
     * createDictionary.
     * @method POST /v1/workspaces/{workspace_id}/dictionaries
     * @remarks Any query params may be sent (none documented).
     */
    createDictionary(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/dictionaries', { body, query: opts.query });
    }
}
