import { Resource } from './base';

/** `nps` resource (generated from openapi.json). */
export class Nps extends Resource {
    /**
     * deleteRatings.
     * @method DELETE /v1/workspaces/{workspace_id}/nps/{np_id}/ratings/{rating_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteRatings(npId: string, ratingId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/nps/{np_id}/ratings/{rating_id}', { path: { np_id: npId, rating_id: ratingId }, query: opts.query });
    }

    /**
     * putRatings.
     * @method PUT /v1/workspaces/{workspace_id}/nps/{np_id}/ratings/{rating_id}
     * @remarks Any query params may be sent (none documented).
     */
    putRatings(npId: string, ratingId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/nps/{np_id}/ratings/{rating_id}', { path: { np_id: npId, rating_id: ratingId }, body, query: opts.query });
    }

    /**
     * getRatings.
     * @method GET /v1/workspaces/{workspace_id}/nps/{np_id}/ratings
     * @remarks Documented query: filters (extra keys allowed).
     */
    getRatings(npId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/nps/{np_id}/ratings', { path: { np_id: npId }, query: opts.query });
    }

    /**
     * ratings.
     * @method POST /v1/workspaces/{workspace_id}/nps/{np_id}/ratings
     * @remarks Any query params may be sent (none documented).
     */
    ratings(npId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/nps/{np_id}/ratings', { path: { np_id: npId }, body, query: opts.query });
    }

    /**
     * patchStatus.
     * @method PATCH /v1/workspaces/{workspace_id}/nps/{np_id}/status
     * @remarks Any query params may be sent (none documented).
     */
    patchStatus(npId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/nps/{np_id}/status', { path: { np_id: npId }, body, query: opts.query });
    }

    /**
     * deleteNp.
     * @method DELETE /v1/workspaces/{workspace_id}/nps/{np_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteNp(npId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/nps/{np_id}', { path: { np_id: npId }, query: opts.query });
    }

    /**
     * getNp.
     * @method GET /v1/workspaces/{workspace_id}/nps/{np_id}
     * @remarks Any query params may be sent (none documented).
     */
    getNp(npId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/nps/{np_id}', { path: { np_id: npId }, query: opts.query });
    }

    /**
     * updateNp.
     * @method PUT /v1/workspaces/{workspace_id}/nps/{np_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateNp(npId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/nps/{np_id}', { path: { np_id: npId }, body, query: opts.query });
    }

    /**
     * listNps.
     * @method GET /v1/workspaces/{workspace_id}/nps
     * @remarks Documented query: filters (extra keys allowed).
     */
    listNps(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/nps', { query: opts.query });
    }

    /**
     * createNp.
     * @method POST /v1/workspaces/{workspace_id}/nps
     * @remarks Any query params may be sent (none documented).
     */
    createNp(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/nps', { body, query: opts.query });
    }
}
