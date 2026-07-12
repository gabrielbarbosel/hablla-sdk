import { Resource } from './base';

/** `invoices` resource (generated from openapi.json). */
export class Invoices extends Resource {
    /**
     * deleteInvoice.
     * @method DELETE /v1/workspaces/{workspace_id}/invoices/{invoice_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteInvoice(invoiceId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/invoices/{invoice_id}', { path: { invoice_id: invoiceId }, query: opts.query });
    }

    /**
     * getInvoice.
     * @method GET /v1/workspaces/{workspace_id}/invoices/{invoice_id}
     * @remarks Any query params may be sent (none documented).
     */
    getInvoice(invoiceId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/invoices/{invoice_id}', { path: { invoice_id: invoiceId }, query: opts.query });
    }

    /**
     * updateInvoice.
     * @method PUT /v1/workspaces/{workspace_id}/invoices/{invoice_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateInvoice(invoiceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/invoices/{invoice_id}', { path: { invoice_id: invoiceId }, body, query: opts.query });
    }

    /**
     * listInvoices.
     * @method GET /v1/workspaces/{workspace_id}/invoices
     * @remarks Documented query: filters (extra keys allowed).
     */
    listInvoices(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/invoices', { query: opts.query });
    }

    /**
     * createInvoice.
     * @method POST /v1/workspaces/{workspace_id}/invoices
     * @remarks Any query params may be sent (none documented).
     */
    createInvoice(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/invoices', { body, query: opts.query });
    }
}
