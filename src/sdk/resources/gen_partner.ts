import { Resource } from './base';

/** `partner` resource (generated from openapi.json). */
export class Partner extends Resource {
    /**
     * createPartner.
     * @method POST /v1/workspaces/partner
     * @remarks Any query params may be sent (none documented).
     */
    createPartner(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/partner', { body, query: opts.query });
    }
}
