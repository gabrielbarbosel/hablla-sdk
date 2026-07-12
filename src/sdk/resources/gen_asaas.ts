import { Resource } from './base';

/** `asaas` resource (generated from openapi.json). */
export class Asaas extends Resource {
    /**
     * getInvoice.
     * @method GET /v1/workspaces/{workspace_id}/asaas/subscription/invoice/{invoice_id}
     * @remarks Any query params may be sent (none documented).
     */
    getInvoice(invoiceId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/asaas/subscription/invoice/{invoice_id}', { path: { invoice_id: invoiceId }, query: opts.query });
    }
}
