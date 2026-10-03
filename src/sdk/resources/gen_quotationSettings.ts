import { Resource } from './base';

/** `quotation-settings` resource (generated from openapi.json). */
export class QuotationSettings extends Resource {
    /**
     * patchQuotationSetting.
     * @method PATCH /v1/workspaces/{workspace_id}/quotation-settings
     * @remarks Any query params may be sent (none documented).
     */
    patchQuotationSetting(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/quotation-settings', { body, query: opts.query });
    }
}
