import { Resource } from './base';
import type { Paged } from '../core/types';

/** A comment. */
export interface Comment {
    id: string;
    [key: string]: unknown;
}

/** `comments` resource (generated from openapi.json). */
export class Comments extends Resource {
    /**
     * deleteComment.
     * @method DELETE /v1/workspaces/{workspace_id}/comments/{comment_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteComment(commentId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/comments/{comment_id}', { path: { comment_id: commentId }, query: opts.query });
    }

    /**
     * createComment.
     * @method POST /v1/workspaces/{workspace_id}/comments/{comment_id}
     * @remarks Any query params may be sent (none documented).
     */
    createComment(commentId: string, body: Partial<Comment>, opts: { query?: Record<string, unknown> } = {}): Promise<Comment> {
        return this.http.post('/v1/workspaces/{workspace_id}/comments/{comment_id}', { path: { comment_id: commentId }, body, query: opts.query });
    }

    /**
     * listComments.
     * @method GET /v1/workspaces/{workspace_id}/comments
     * @remarks Documented query: filters (extra keys allowed).
     */
    listComments(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Comment>> {
        return this.http.get('/v1/workspaces/{workspace_id}/comments', { query: opts.query });
    }
}
