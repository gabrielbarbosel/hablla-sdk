import { Resource } from './base';

/** `enrichment` resource (generated from openapi.json). */
export class Enrichment extends Resource {
    /**
     * checkDocument.
     * @method POST /v1/enrichment/check-document
     * @remarks Any query params may be sent (none documented).
     */
    checkDocument(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/enrichment/check-document', { body, query: opts.query });
    }
}
