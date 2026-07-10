import { Resource } from './base';

/** `seo-projects` resource (generated from openapi.json). */
export class SeoProjects extends Resource {
    /**
     * deleteSeoSites.
     * @method DELETE /v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}/seo-sites/{seo_site_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSeoSites(seoProjectId: string, seoSiteId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}/seo-sites/{seo_site_id}', { path: { seo_project_id: seoProjectId, seo_site_id: seoSiteId }, query: opts.query });
    }

    /**
     * getSeoSite.
     * @method GET /v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}/seo-sites/{seo_site_id}
     * @remarks Any query params may be sent (none documented).
     */
    getSeoSite(seoProjectId: string, seoSiteId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}/seo-sites/{seo_site_id}', { path: { seo_project_id: seoProjectId, seo_site_id: seoSiteId }, query: opts.query });
    }

    /**
     * putSeoSites.
     * @method PUT /v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}/seo-sites/{seo_site_id}
     * @remarks Any query params may be sent (none documented).
     */
    putSeoSites(seoProjectId: string, seoSiteId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}/seo-sites/{seo_site_id}', { path: { seo_project_id: seoProjectId, seo_site_id: seoSiteId }, body, query: opts.query });
    }

    /**
     * listSeoSites.
     * @method GET /v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}/seo-sites
     * @remarks Documented query: filters (extra keys allowed).
     */
    listSeoSites(seoProjectId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}/seo-sites', { path: { seo_project_id: seoProjectId }, query: opts.query });
    }

    /**
     * seoSites.
     * @method POST /v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}/seo-sites
     * @remarks Any query params may be sent (none documented).
     */
    seoSites(seoProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}/seo-sites', { path: { seo_project_id: seoProjectId }, body, query: opts.query });
    }

    /**
     * deleteSeoProject.
     * @method DELETE /v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSeoProject(seoProjectId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}', { path: { seo_project_id: seoProjectId }, query: opts.query });
    }

    /**
     * getSeoProject.
     * @method GET /v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}
     * @remarks Any query params may be sent (none documented).
     */
    getSeoProject(seoProjectId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}', { path: { seo_project_id: seoProjectId }, query: opts.query });
    }

    /**
     * updateSeoProject.
     * @method PUT /v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateSeoProject(seoProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/seo-projects/{seo_project_id}', { path: { seo_project_id: seoProjectId }, body, query: opts.query });
    }

    /**
     * getCheckIfExists.
     * @method GET /v1/workspaces/{workspace_id}/seo-projects/check-if-exists
     * @remarks Any query params may be sent (none documented).
     */
    getCheckIfExists(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/seo-projects/check-if-exists', { query: opts.query });
    }

    /**
     * listSeoProjects.
     * @method GET /v1/workspaces/{workspace_id}/seo-projects
     * @remarks Documented query: filters (extra keys allowed).
     */
    listSeoProjects(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/seo-projects', { query: opts.query });
    }

    /**
     * createSeoProject.
     * @method POST /v1/workspaces/{workspace_id}/seo-projects
     * @remarks Any query params may be sent (none documented).
     */
    createSeoProject(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/seo-projects', { body, query: opts.query });
    }
}
