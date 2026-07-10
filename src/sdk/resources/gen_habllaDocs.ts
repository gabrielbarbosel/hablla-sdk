import { Resource } from './base';

/** `hablla-docs` resource (generated from openapi.json). */
export class HabllaDocs extends Resource {
    /**
     * updateHabllaDoc.
     * @method PUT /v1/hablla-docs/{hablla_doc_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateHabllaDoc(habllaDocId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/hablla-docs/{hablla_doc_id}', { path: { hablla_doc_id: habllaDocId }, body, query: opts.query });
    }

    /**
     * listHabllaDocs.
     * @method GET /v1/hablla-docs
     * @remarks Documented query: filters (extra keys allowed).
     */
    listHabllaDocs(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/hablla-docs', { query: opts.query });
    }

    /**
     * createHabllaDoc.
     * @method POST /v1/hablla-docs
     * @remarks Any query params may be sent (none documented).
     */
    createHabllaDoc(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/hablla-docs', { body, query: opts.query });
    }
}
