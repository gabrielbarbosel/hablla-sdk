import { Resource } from './base';

/** `temp` resource (generated from openapi.json). */
export class Temp extends Resource {
    /**
     * listTemp.
     * @method GET /v1/workspaces/temp
     * @remarks Documented query: filters (extra keys allowed).
     */
    listTemp(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/temp', { query: opts.query });
    }
}
