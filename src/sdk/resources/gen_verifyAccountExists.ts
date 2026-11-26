import { Resource } from './base';

/** `verify-account-exists` resource (generated from openapi.json). */
export class VerifyAccountExists extends Resource {
    /**
     * listVerifyAccountExists.
     * @method GET /v1/workspaces/{workspace_id}/verify-account-exists
     * @remarks Documented query: email (extra keys allowed).
     */
    listVerifyAccountExists(opts: { query?: { email?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/verify-account-exists', { query: opts.query });
    }
}
