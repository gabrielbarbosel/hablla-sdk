import { Resource } from './base';
import type { Paged } from '../core/types';

/** A credential (connection auth). */
export interface Credential {
    id: string;
    workspace?: string;
    name?: string;
    std_name?: string;
    type?: string;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    [key: string]: unknown;
}

/** `credentials` resource (generated from openapi.json). */
export class Credentials extends Resource {
    /**
     * deleteCredential.
     * @method DELETE /v1/workspaces/{workspace_id}/credentials/{credential_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteCredential(credentialId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/credentials/{credential_id}', { path: { credential_id: credentialId }, query: opts.query });
    }

    /**
     * getCredential.
     * @method GET /v1/workspaces/{workspace_id}/credentials/{credential_id}
     * @remarks Any query params may be sent (none documented).
     */
    getCredential(credentialId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Credential> {
        return this.http.get('/v1/workspaces/{workspace_id}/credentials/{credential_id}', { path: { credential_id: credentialId }, query: opts.query });
    }

    /**
     * updateCredential.
     * @method PUT /v1/workspaces/{workspace_id}/credentials/{credential_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateCredential(credentialId: string, body: Partial<Credential>, opts: { query?: Record<string, unknown> } = {}): Promise<Credential> {
        return this.http.put('/v1/workspaces/{workspace_id}/credentials/{credential_id}', { path: { credential_id: credentialId }, body, query: opts.query });
    }

    /**
     * listCredentials.
     * @method GET /v1/workspaces/{workspace_id}/credentials
     * @remarks Documented query: filters (extra keys allowed).
     */
    listCredentials(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Credential>> {
        return this.http.get('/v1/workspaces/{workspace_id}/credentials', { query: opts.query });
    }

    /**
     * createCredential.
     * @method POST /v1/workspaces/{workspace_id}/credentials
     * @remarks Any query params may be sent (none documented).
     */
    createCredential(body: Partial<Credential>, opts: { query?: Record<string, unknown> } = {}): Promise<Credential> {
        return this.http.post('/v1/workspaces/{workspace_id}/credentials', { body, query: opts.query });
    }

    /**
     * loginOauth.
     * @method POST /v2/workspaces/{workspace_id}/credentials/login-oauth
     * @remarks Any query params may be sent (none documented).
     */
    loginOauth(body: Partial<Credential>, opts: { query?: Record<string, unknown> } = {}): Promise<Credential> {
        return this.http.post('/v2/workspaces/{workspace_id}/credentials/login-oauth', { body, query: opts.query });
    }
}
