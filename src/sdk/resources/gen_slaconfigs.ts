import { Resource } from './base';

/** `slaconfigs` resource (generated from openapi.json). */
export class Slaconfigs extends Resource {
    /**
     * deleteSlaconfig.
     * @method DELETE /v1/workspaces/{workspace_id}/slaconfigs/{slaconfig_id}
     * @remarks Documented query: data (extra keys allowed).
     */
    deleteSlaconfig(slaconfigId: string, opts: { query?: { data?: string } & Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/slaconfigs/{slaconfig_id}', { path: { slaconfig_id: slaconfigId }, query: opts.query });
    }

    /**
     * getSlaconfig.
     * @method GET /v1/workspaces/{workspace_id}/slaconfigs/{slaconfig_id}
     * @remarks Any query params may be sent (none documented).
     */
    getSlaconfig(slaconfigId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/slaconfigs/{slaconfig_id}', { path: { slaconfig_id: slaconfigId }, query: opts.query });
    }

    /**
     * updateSlaconfig.
     * @method PUT /v1/workspaces/{workspace_id}/slaconfigs/{slaconfig_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateSlaconfig(slaconfigId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/slaconfigs/{slaconfig_id}', { path: { slaconfig_id: slaconfigId }, body, query: opts.query });
    }

    /**
     * listSlaconfigs.
     * @method GET /v1/workspaces/{workspace_id}/slaconfigs
     * @remarks Documented query: filters (extra keys allowed).
     */
    listSlaconfigs(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/slaconfigs', { query: opts.query });
    }

    /**
     * createSlaconfig.
     * @method POST /v1/workspaces/{workspace_id}/slaconfigs
     * @remarks Any query params may be sent (none documented).
     */
    createSlaconfig(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/slaconfigs', { body, query: opts.query });
    }
}
