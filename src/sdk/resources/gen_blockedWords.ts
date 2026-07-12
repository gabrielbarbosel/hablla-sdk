import { Resource } from './base';

/** `blocked-words` resource (generated from openapi.json). */
export class BlockedWords extends Resource {
    /**
     * deleteBlockedWord.
     * @method DELETE /v1/workspaces/{workspace_id}/blocked-words/{blocked_word_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteBlockedWord(blockedWordId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/blocked-words/{blocked_word_id}', { path: { blocked_word_id: blockedWordId }, query: opts.query });
    }

    /**
     * listBlockedWords.
     * @method GET /v1/workspaces/{workspace_id}/blocked-words
     * @remarks Documented query: filters (extra keys allowed).
     */
    listBlockedWords(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/blocked-words', { query: opts.query });
    }

    /**
     * createBlockedWord.
     * @method POST /v1/workspaces/{workspace_id}/blocked-words
     * @remarks Any query params may be sent (none documented).
     */
    createBlockedWord(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/blocked-words', { body, query: opts.query });
    }
}
