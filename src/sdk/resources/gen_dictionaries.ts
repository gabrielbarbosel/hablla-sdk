import { Resource } from './base';
import type { Paged } from '../core/types';

/** A dictionary (custom entity definition). */
export interface Dictionary {
    id: string;
    name?: string;
    std_name?: string;
    title?: string;
    workspace?: string;
    direct_order?: string;
    create?: unknown;
    update?: unknown;
    delete?: unknown;
    request_options?: unknown;
    details?: unknown;
    is_enable?: boolean;
    show_in_menu?: boolean;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    is_depreciated?: boolean;
    [key: string]: unknown;
}

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
    getDictionary(dictionaryId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Dictionary> {
        return this.http.get('/v1/workspaces/{workspace_id}/dictionaries/{dictionary_id}', { path: { dictionary_id: dictionaryId }, query: opts.query });
    }

    /**
     * updateDictionary.
     * @method PUT /v1/workspaces/{workspace_id}/dictionaries/{dictionary_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateDictionary(dictionaryId: string, body: Partial<Dictionary>, opts: { query?: Record<string, unknown> } = {}): Promise<Dictionary> {
        return this.http.put('/v1/workspaces/{workspace_id}/dictionaries/{dictionary_id}', { path: { dictionary_id: dictionaryId }, body, query: opts.query });
    }

    /**
     * listDictionaries.
     * @method GET /v1/workspaces/{workspace_id}/dictionaries
     * @remarks Documented query: filters (extra keys allowed).
     */
    listDictionaries(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Dictionary>> {
        return this.http.get('/v1/workspaces/{workspace_id}/dictionaries', { query: opts.query });
    }

    /**
     * createDictionary.
     * @method POST /v1/workspaces/{workspace_id}/dictionaries
     * @remarks Any query params may be sent (none documented).
     */
    createDictionary(body: Partial<Dictionary>, opts: { query?: Record<string, unknown> } = {}): Promise<Dictionary> {
        return this.http.post('/v1/workspaces/{workspace_id}/dictionaries', { body, query: opts.query });
    }
}
