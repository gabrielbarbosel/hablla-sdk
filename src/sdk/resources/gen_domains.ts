import { Resource } from './base';

/** `domains` resource (generated from openapi.json). */
export class Domains extends Resource {
    /**
     * deleteDomain.
     * @method DELETE /v1/workspaces/{workspace_id}/domains/{domain_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteDomain(domainId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/domains/{domain_id}', { path: { domain_id: domainId }, query: opts.query });
    }

    /**
     * getDomain.
     * @method GET /v1/workspaces/{workspace_id}/domains/{domain_id}
     * @remarks Any query params may be sent (none documented).
     */
    getDomain(domainId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/domains/{domain_id}', { path: { domain_id: domainId }, query: opts.query });
    }

    /**
     * updateDomain.
     * @method PUT /v1/workspaces/{workspace_id}/domains/{domain_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateDomain(domainId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/domains/{domain_id}', { path: { domain_id: domainId }, body, query: opts.query });
    }

    /**
     * getAvailableName.
     * @method GET /v1/workspaces/{workspace_id}/domains/available-name
     * @remarks Any query params may be sent (none documented).
     */
    getAvailableName(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/domains/available-name', { query: opts.query });
    }

    /**
     * listDomains.
     * @method GET /v1/workspaces/{workspace_id}/domains
     * @remarks Documented query: filters (extra keys allowed).
     */
    listDomains(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/domains', { query: opts.query });
    }

    /**
     * createDomain.
     * @method POST /v1/workspaces/{workspace_id}/domains
     * @remarks Any query params may be sent (none documented).
     */
    createDomain(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/domains', { body, query: opts.query });
    }
}
