import { Resource } from './base';

/** `partners` resource (generated from openapi.json). */
export class Partners extends Resource {
    /**
     * deletePartner.
     * @method DELETE /v1/partners/{partner_id}
     * @remarks Any query params may be sent (none documented).
     */
    deletePartner(partnerId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/partners/{partner_id}', { path: { partner_id: partnerId }, query: opts.query });
    }

    /**
     * updatePartner.
     * @method PUT /v1/partners/{partner_id}
     * @remarks Any query params may be sent (none documented).
     */
    updatePartner(partnerId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/partners/{partner_id}', { path: { partner_id: partnerId }, body, query: opts.query });
    }

    /**
     * listPartners.
     * @method GET /v1/partners
     * @remarks Documented query: filters (extra keys allowed).
     */
    listPartners(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/partners', { query: opts.query });
    }

    /**
     * createPartner.
     * @method POST /v1/partners
     * @remarks Any query params may be sent (none documented).
     */
    createPartner(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/partners', { body, query: opts.query });
    }
}
