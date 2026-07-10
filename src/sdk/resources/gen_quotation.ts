import { Resource } from './base';

/** `quotation` resource (generated from openapi.json). */
export class Quotation extends Resource {
    /**
     * listQuotationGlobal.
     * @method GET /v1/quotation
     * @remarks Any query params may be sent (none documented).
     */
    listQuotationGlobal(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/quotation', { query: opts.query });
    }

    /**
     * updateQuotation.
     * @method PATCH /v1/quotation
     * @remarks Any query params may be sent (none documented).
     */
    updateQuotation(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/quotation', { body, query: opts.query });
    }

    /**
     * publish.
     * @method POST /v1/workspaces/{workspace_id}/quotation/publish
     * @remarks Any query params may be sent (none documented).
     */
    publish(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/quotation/publish', { body, query: opts.query });
    }

    /**
     * listQuotation.
     * @method GET /v1/workspaces/{workspace_id}/quotation
     * @remarks Documented query: filters (extra keys allowed).
     */
    listQuotation(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/quotation', { query: opts.query });
    }
}
