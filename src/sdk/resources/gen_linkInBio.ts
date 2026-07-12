import { Resource } from './base';

/** `link-in-bio` resource (generated from openapi.json). */
export class LinkInBio extends Resource {
    /**
     * deleteLinkInBio.
     * @method DELETE /v1/workspaces/{workspace_id}/link-in-bio/{link_in_bio_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteLinkInBio(linkInBioId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/link-in-bio/{link_in_bio_id}', { path: { link_in_bio_id: linkInBioId }, query: opts.query });
    }

    /**
     * getLinkInBio.
     * @method GET /v1/workspaces/{workspace_id}/link-in-bio/{link_in_bio_id}
     * @remarks Any query params may be sent (none documented).
     */
    getLinkInBio(linkInBioId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/link-in-bio/{link_in_bio_id}', { path: { link_in_bio_id: linkInBioId }, query: opts.query });
    }

    /**
     * updateLinkInBio.
     * @method PUT /v1/workspaces/{workspace_id}/link-in-bio/{link_in_bio_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateLinkInBio(linkInBioId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/link-in-bio/{link_in_bio_id}', { path: { link_in_bio_id: linkInBioId }, body, query: opts.query });
    }

    /**
     * listLinkInBio.
     * @method GET /v1/workspaces/{workspace_id}/link-in-bio
     * @remarks Documented query: filters (extra keys allowed).
     */
    listLinkInBio(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/link-in-bio', { query: opts.query });
    }

    /**
     * createLinkInBio.
     * @method POST /v1/workspaces/{workspace_id}/link-in-bio
     * @remarks Any query params may be sent (none documented).
     */
    createLinkInBio(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/link-in-bio', { body, query: opts.query });
    }
}
