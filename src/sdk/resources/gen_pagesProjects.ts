import { Resource } from './base';

/** `pages-projects` resource (generated from openapi.json). */
export class PagesProjects extends Resource {
    /**
     * Restore a page from a page history by id.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/page-history/{page_history_id}
     * @remarks Any query params may be sent (none documented).
     */
    putPageHistory(pagesProjectId: string, pageId: string, pageHistoryId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/page-history/{page_history_id}', { path: { pages_project_id: pagesProjectId, page_id: pageId, page_history_id: pageHistoryId }, body, query: opts.query });
    }

    /**
     * Set a page to be used with manual editor.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/enable-manual-editor
     * @remarks Any query params may be sent (none documented).
     */
    enableManualEditor(pagesProjectId: string, pageId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/enable-manual-editor', { path: { pages_project_id: pagesProjectId, page_id: pageId }, body, query: opts.query });
    }

    /**
     * Get all page version history from a page by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/page-history
     * @remarks Documented query: filters, page, limit, order, user, direction_order, populate (extra keys allowed).
     */
    getPageHistory(pagesProjectId: string, pageId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; user?: string; direction_order?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/page-history', { path: { pages_project_id: pagesProjectId, page_id: pageId }, query: opts.query });
    }

    /**
     * putPublic.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/public
     * @remarks Any query params may be sent (none documented).
     */
    putPublic(pagesProjectId: string, pageId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/public', { path: { pages_project_id: pagesProjectId, page_id: pageId }, body, query: opts.query });
    }

    /**
     * Republish page by id.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/republish
     * @remarks Any query params may be sent (none documented).
     */
    republishPageById(pagesProjectId: string, pageId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/republish', { path: { pages_project_id: pagesProjectId, page_id: pageId }, body, query: opts.query });
    }

    /**
     * Unpublish page by id.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/unpublish
     * @remarks Any query params may be sent (none documented).
     */
    patchUnpublish(pagesProjectId: string, pageId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/unpublish', { path: { pages_project_id: pagesProjectId, page_id: pageId }, body, query: opts.query });
    }

    /**
     * Delete page by id.
     * @method DELETE /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}
     * @remarks Any query params may be sent (none documented).
     */
    deletePages(pagesProjectId: string, pageId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}', { path: { pages_project_id: pagesProjectId, page_id: pageId }, query: opts.query });
    }

    /**
     * Get a page by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}
     * @remarks Any query params may be sent (none documented).
     */
    getPage(pagesProjectId: string, pageId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}', { path: { pages_project_id: pagesProjectId, page_id: pageId }, query: opts.query });
    }

    /**
     * Update page by id.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}
     * @remarks Any query params may be sent (none documented).
     */
    putPages(pagesProjectId: string, pageId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}', { path: { pages_project_id: pagesProjectId, page_id: pageId }, body, query: opts.query });
    }

    /**
     * Remove a page project shared components by id.
     * @method DELETE /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{shared_component_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSharedComponents(pagesProjectId: string, sharedComponentId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{shared_component_id}', { path: { pages_project_id: pagesProjectId, shared_component_id: sharedComponentId }, query: opts.query });
    }

    /**
     * Get a page project shared component by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{shared_component_id}
     * @remarks Any query params may be sent (none documented).
     */
    getSharedComponent(pagesProjectId: string, sharedComponentId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{shared_component_id}', { path: { pages_project_id: pagesProjectId, shared_component_id: sharedComponentId }, query: opts.query });
    }

    /**
     * Update a page project shared components by id.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{shared_component_id}
     * @remarks Any query params may be sent (none documented).
     */
    putSharedComponents(pagesProjectId: string, sharedComponentId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{shared_component_id}', { path: { pages_project_id: pagesProjectId, shared_component_id: sharedComponentId }, body, query: opts.query });
    }

    /**
     * Get all public pages templates.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/pages/templates/public
     * @remarks Documented query: filters, page, limit, order, project, slug, name, direction_order, is_template, category, populate, uploaded_on_github (extra keys allowed).
     */
    getPublic(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; project?: string; slug?: string; name?: string; direction_order?: string; is_template?: string; category?: string; populate?: string[]; uploaded_on_github?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/pages/templates/public', { query: opts.query });
    }

    /**
     * Get all workspace pages templates.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/pages/templates/workspace
     * @remarks Documented query: filters, page, limit, order, project, slug, name, direction_order, is_template, category, populate, uploaded_on_github (extra keys allowed).
     */
    getWorkspace(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; project?: string; slug?: string; name?: string; direction_order?: string; is_template?: string; category?: string; populate?: string[]; uploaded_on_github?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/pages/templates/workspace', { query: opts.query });
    }

    /**
     * Add custom domain from page project by id.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/add-domain
     * @remarks Any query params may be sent (none documented).
     */
    addDomain(pagesProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/add-domain', { path: { pages_project_id: pagesProjectId }, body, query: opts.query });
    }

    /**
     * Use AI.
     * @method POST /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/ai
     * @remarks Any query params may be sent (none documented).
     */
    ai(pagesProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/ai', { path: { pages_project_id: pagesProjectId }, body, query: opts.query });
    }

    /**
     * Get all pages.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages
     * @remarks Documented query: filters, page, limit, order, project, slug, name, direction_order, is_template, category, populate, uploaded_on_github (extra keys allowed).
     */
    getPages(pagesProjectId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; project?: string; slug?: string; name?: string; direction_order?: string; is_template?: string; category?: string; populate?: string[]; uploaded_on_github?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages', { path: { pages_project_id: pagesProjectId }, query: opts.query });
    }

    /**
     * Create a new page.
     * @method POST /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages
     * @remarks Any query params may be sent (none documented).
     */
    pages(pagesProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages', { path: { pages_project_id: pagesProjectId }, body, query: opts.query });
    }

    /**
     * Publish page by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/publish
     * @remarks Any query params may be sent (none documented).
     */
    publish(pagesProjectId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/publish', { path: { pages_project_id: pagesProjectId }, query: opts.query });
    }

    /**
     * Remove custom domain from page project by id.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/remove-domain
     * @remarks Any query params may be sent (none documented).
     */
    removeDomain(pagesProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/remove-domain', { path: { pages_project_id: pagesProjectId }, body, query: opts.query });
    }

    /**
     * Republish a page project by id.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/republish
     * @remarks Any query params may be sent (none documented).
     */
    republishPagesProjectById(pagesProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/republish', { path: { pages_project_id: pagesProjectId }, body, query: opts.query });
    }

    /**
     * Get a page shared components by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components
     * @remarks Any query params may be sent (none documented).
     */
    getSharedComponents(pagesProjectId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components', { path: { pages_project_id: pagesProjectId }, query: opts.query });
    }

    /**
     * Add a page project shared components.
     * @method POST /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components
     * @remarks Any query params may be sent (none documented).
     */
    sharedComponents(pagesProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components', { path: { pages_project_id: pagesProjectId }, body, query: opts.query });
    }

    /**
     * Unpublish a page project by id.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/unpublish
     * @remarks Any query params may be sent (none documented).
     */
    putUnpublish(pagesProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/unpublish', { path: { pages_project_id: pagesProjectId }, body, query: opts.query });
    }

    /**
     * Delete page project by id.
     * @method DELETE /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}
     * @remarks Any query params may be sent (none documented).
     */
    deletePagesProject(pagesProjectId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}', { path: { pages_project_id: pagesProjectId }, query: opts.query });
    }

    /**
     * Get pages project by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}
     * @remarks Any query params may be sent (none documented).
     */
    getPagesProject(pagesProjectId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}', { path: { pages_project_id: pagesProjectId }, query: opts.query });
    }

    /**
     * patchPagesProject.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}
     * @remarks Any query params may be sent (none documented).
     */
    patchPagesProject(pagesProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}', { path: { pages_project_id: pagesProjectId }, body, query: opts.query });
    }

    /**
     * Update page project by id.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}
     * @remarks Any query params may be sent (none documented).
     */
    updatePagesProject(pagesProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}', { path: { pages_project_id: pagesProjectId }, body, query: opts.query });
    }

    /**
     * Get all pages projects.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects
     * @remarks Documented query: filters, page, limit, order, name, direction_order, populate (extra keys allowed).
     */
    listPagesProjects(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; name?: string; direction_order?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects', { query: opts.query });
    }

    /**
     * Create a page project.
     * @method POST /v1/workspaces/{workspace_id}/pages-projects
     * @remarks Any query params may be sent (none documented).
     */
    createPagesProject(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/pages-projects', { body, query: opts.query });
    }
}
