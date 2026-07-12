import { Resource } from './base';
import type { Paged } from '../core/types';

/** A temporary access token. */
export interface TempToken {
    id: string;
    name?: string;
    workspace?: string;
    user?: string;
    role_type?: string;
    is_expired?: boolean;
    expires_at?: string;
    last_used_at?: string;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    user_id?: string;
    [key: string]: unknown;
}

/** `temp-tokens` resource (generated from openapi.json). */
export class TempTokens extends Resource {
    /**
     * deleteTempToken.
     * @method DELETE /v1/workspaces/{workspace_id}/temp-tokens/{temp_token_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteTempToken(tempTokenId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/temp-tokens/{temp_token_id}', { path: { temp_token_id: tempTokenId }, query: opts.query });
    }

    /**
     * listTempTokens.
     * @method GET /v1/workspaces/{workspace_id}/temp-tokens
     * @remarks Documented query: filters (extra keys allowed).
     */
    listTempTokens(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<TempToken>> {
        return this.http.get('/v1/workspaces/{workspace_id}/temp-tokens', { query: opts.query });
    }

    /**
     * createTempToken.
     * @method POST /v1/workspaces/{workspace_id}/temp-tokens
     * @remarks Any query params may be sent (none documented).
     */
    createTempToken(body: Partial<TempToken>, opts: { query?: Record<string, unknown> } = {}): Promise<TempToken> {
        return this.http.post('/v1/workspaces/{workspace_id}/temp-tokens', { body, query: opts.query });
    }
}
