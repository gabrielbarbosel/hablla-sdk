import { Resource } from './base';

/** `feed-posts` resource (generated from openapi.json). */
export class FeedPosts extends Resource {
    /**
     * deleteComments.
     * @method DELETE /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/comments/{comment_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteComments(feedPostId: string, commentId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/comments/{comment_id}', { path: { feed_post_id: feedPostId, comment_id: commentId }, query: opts.query });
    }

    /**
     * patchComments.
     * @method PATCH /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/comments/{comment_id}
     * @remarks Any query params may be sent (none documented).
     */
    patchComments(feedPostId: string, commentId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/comments/{comment_id}', { path: { feed_post_id: feedPostId, comment_id: commentId }, body, query: opts.query });
    }

    /**
     * getComments.
     * @method GET /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/comments
     * @remarks Any query params may be sent (none documented).
     */
    getComments(feedPostId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/comments', { path: { feed_post_id: feedPostId }, query: opts.query });
    }

    /**
     * comments.
     * @method POST /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/comments
     * @remarks Any query params may be sent (none documented).
     */
    comments(feedPostId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/comments', { path: { feed_post_id: feedPostId }, body, query: opts.query });
    }

    /**
     * deletePollVotes.
     * @method DELETE /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/poll-votes/{poll_vote_id}
     * @remarks Any query params may be sent (none documented).
     */
    deletePollVotes(feedPostId: string, pollVoteId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/poll-votes/{poll_vote_id}', { path: { feed_post_id: feedPostId, poll_vote_id: pollVoteId }, query: opts.query });
    }

    /**
     * getPollVotes.
     * @method GET /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/poll-votes
     * @remarks Any query params may be sent (none documented).
     */
    getPollVotes(feedPostId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/poll-votes', { path: { feed_post_id: feedPostId }, query: opts.query });
    }

    /**
     * pollVotes.
     * @method POST /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/poll-votes
     * @remarks Any query params may be sent (none documented).
     */
    pollVotes(feedPostId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/poll-votes', { path: { feed_post_id: feedPostId }, body, query: opts.query });
    }

    /**
     * deleteReaction.
     * @method DELETE /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/reaction
     * @remarks Any query params may be sent (none documented).
     */
    deleteReaction(feedPostId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/reaction', { path: { feed_post_id: feedPostId }, query: opts.query });
    }

    /**
     * reaction.
     * @method POST /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/reaction
     * @remarks Any query params may be sent (none documented).
     */
    reaction(feedPostId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}/reaction', { path: { feed_post_id: feedPostId }, body, query: opts.query });
    }

    /**
     * deleteFeedPost.
     * @method DELETE /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteFeedPost(feedPostId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}', { path: { feed_post_id: feedPostId }, query: opts.query });
    }

    /**
     * getFeedPost.
     * @method GET /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}
     * @remarks Any query params may be sent (none documented).
     */
    getFeedPost(feedPostId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}', { path: { feed_post_id: feedPostId }, query: opts.query });
    }

    /**
     * updateFeedPost.
     * @method PUT /v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateFeedPost(feedPostId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/feed-posts/{feed_post_id}', { path: { feed_post_id: feedPostId }, body, query: opts.query });
    }

    /**
     * getHabllaPosts.
     * @method GET /v1/workspaces/{workspace_id}/feed-posts/hablla-posts
     * @remarks Any query params may be sent (none documented).
     */
    getHabllaPosts(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/feed-posts/hablla-posts', { query: opts.query });
    }

    /**
     * getReactions.
     * @method GET /v1/workspaces/{workspace_id}/feed-posts/reactions
     * @remarks Documented query: filters (extra keys allowed).
     */
    getReactions(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/feed-posts/reactions', { query: opts.query });
    }

    /**
     * deleteSchedule.
     * @method DELETE /v1/workspaces/{workspace_id}/feed-posts/schedule/{schedule_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSchedule(scheduleId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/feed-posts/schedule/{schedule_id}', { path: { schedule_id: scheduleId }, query: opts.query });
    }

    /**
     * getSchedule.
     * @method GET /v1/workspaces/{workspace_id}/feed-posts/schedule/{schedule_id}
     * @remarks Any query params may be sent (none documented).
     */
    getSchedule(scheduleId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/feed-posts/schedule/{schedule_id}', { path: { schedule_id: scheduleId }, query: opts.query });
    }

    /**
     * patchSchedule.
     * @method PATCH /v1/workspaces/{workspace_id}/feed-posts/schedule/{schedule_id}
     * @remarks Any query params may be sent (none documented).
     */
    patchSchedule(scheduleId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/feed-posts/schedule/{schedule_id}', { path: { schedule_id: scheduleId }, body, query: opts.query });
    }

    /**
     * listSchedule.
     * @method GET /v1/workspaces/{workspace_id}/feed-posts/schedule
     * @remarks Documented query: filters (extra keys allowed).
     */
    listSchedule(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/feed-posts/schedule', { query: opts.query });
    }

    /**
     * schedule.
     * @method POST /v1/workspaces/{workspace_id}/feed-posts/schedule
     * @remarks Any query params may be sent (none documented).
     */
    schedule(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/feed-posts/schedule', { body, query: opts.query });
    }

    /**
     * listFeedPosts.
     * @method GET /v1/workspaces/{workspace_id}/feed-posts
     * @remarks Documented query: filters (extra keys allowed).
     */
    listFeedPosts(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/feed-posts', { query: opts.query });
    }

    /**
     * createFeedPost.
     * @method POST /v1/workspaces/{workspace_id}/feed-posts
     * @remarks Any query params may be sent (none documented).
     */
    createFeedPost(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/feed-posts', { body, query: opts.query });
    }
}
