import { Resource } from './base';

/** `pages` resource (generated from openapi.json). */
export class Pages extends Resource {
    /**
     * Add custom domain from page project by id.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{id}/add-domain
     * @remarks Any query params may be sent (none documented).
     */
    addDomain(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{id}/add-domain', { path: { id }, body, query: opts.query });
    }

    /**
     * Use AI.
     * @method POST /v1/workspaces/{workspace_id}/pages-projects/{id}/ai
     * @remarks Any query params may be sent (none documented).
     */
    ai(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/pages-projects/{id}/ai', { path: { id }, body, query: opts.query });
    }

    /**
     * Set page project editor.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{id}/editor-version
     * @remarks Any query params may be sent (none documented).
     */
    patchEditorVersion(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{id}/editor-version', { path: { id }, body, query: opts.query });
    }

    /**
     * Get all pages.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{id}/pages
     * @remarks Documented query: filters, page, limit, order, project, slug, name, direction_order, is_template, category, populate, uploaded_on_github (extra keys allowed).
     */
    listPages(id: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; project?: string; slug?: string; name?: string; direction_order?: string; is_template?: string; category?: string; populate?: string[]; uploaded_on_github?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{id}/pages', { path: { id }, query: opts.query });
    }

    /**
     * Create a new page.
     * @method POST /v1/workspaces/{workspace_id}/pages-projects/{id}/pages
     * @remarks Any query params may be sent (none documented).
     */
    createPage(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/pages-projects/{id}/pages', { path: { id }, body, query: opts.query });
    }

    /**
     * Publish page by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{id}/publish
     * @remarks Any query params may be sent (none documented).
     */
    publish(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{id}/publish', { path: { id }, query: opts.query });
    }

    /**
     * Remove custom domain from page project by id.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{id}/remove-domain
     * @remarks Any query params may be sent (none documented).
     */
    removeDomain(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{id}/remove-domain', { path: { id }, body, query: opts.query });
    }

    /**
     * Republish a page project by id.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{id}/republish
     * @remarks Any query params may be sent (none documented).
     */
    updateRepublish(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{id}/republish', { path: { id }, body, query: opts.query });
    }

    /**
     * Get a page shared components by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{id}/shared-components
     * @remarks Any query params may be sent (none documented).
     */
    listSharedComponents(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{id}/shared-components', { path: { id }, query: opts.query });
    }

    /**
     * Add a page project shared components.
     * @method POST /v1/workspaces/{workspace_id}/pages-projects/{id}/shared-components
     * @remarks Any query params may be sent (none documented).
     */
    sharedComponents(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/pages-projects/{id}/shared-components', { path: { id }, body, query: opts.query });
    }

    /**
     * Unpublish a page project by id.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{id}/unpublish
     * @remarks Any query params may be sent (none documented).
     */
    updateUnpublish(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{id}/unpublish', { path: { id }, body, query: opts.query });
    }

    /**
     * Delete page project by id.
     * @method DELETE /v1/workspaces/{workspace_id}/pages-projects/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deletePagesProjects(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/pages-projects/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Get pages project by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getPagesProject(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Update page project by id.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{id}
     * @remarks Any query params may be sent (none documented).
     */
    putPagesProjects(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{id}', { path: { id }, body, query: opts.query });
    }

    /**
     * Set a page to be used with manual editor.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}/enable-manual-editor
     * @remarks Any query params may be sent (none documented).
     */
    enableManualEditor(pagesProjectId: string, id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}/enable-manual-editor', { path: { pages_project_id: pagesProjectId, id }, body, query: opts.query });
    }

    /**
     * Get all page version history from a page by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}/page-history
     * @remarks Documented query: filters, page, limit, order, user, direction_order, populate (extra keys allowed).
     */
    getPageHistory(pagesProjectId: string, id: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; user?: string; direction_order?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}/page-history', { path: { pages_project_id: pagesProjectId, id }, query: opts.query });
    }

    /**
     * Republish page by id.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}/republish
     * @remarks Any query params may be sent (none documented).
     */
    updatePagesRepublish(pagesProjectId: string, id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}/republish', { path: { pages_project_id: pagesProjectId, id }, body, query: opts.query });
    }

    /**
     * Unpublish page by id.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}/unpublish
     * @remarks Any query params may be sent (none documented).
     */
    updatePagesUnpublish(pagesProjectId: string, id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}/unpublish', { path: { pages_project_id: pagesProjectId, id }, body, query: opts.query });
    }

    /**
     * Delete page by id.
     * @method DELETE /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deletePage(pagesProjectId: string, id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}', { path: { pages_project_id: pagesProjectId, id }, query: opts.query });
    }

    /**
     * Get a page by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getPage(pagesProjectId: string, id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}', { path: { pages_project_id: pagesProjectId, id }, query: opts.query });
    }

    /**
     * Update page by id.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}
     * @remarks Any query params may be sent (none documented).
     */
    updatePage(pagesProjectId: string, id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{id}', { path: { pages_project_id: pagesProjectId, id }, body, query: opts.query });
    }

    /**
     * Restore a page from a page history by id.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/page-history/{id}
     * @remarks Any query params may be sent (none documented).
     */
    putPageHistory(pagesProjectId: string, pageId: string, id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/page-history/{id}', { path: { pages_project_id: pagesProjectId, page_id: pageId, id }, body, query: opts.query });
    }

    /**
     * Remove a page project shared components by id.
     * @method DELETE /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSharedComponents(pagesProjectId: string, id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{id}', { path: { pages_project_id: pagesProjectId, id }, query: opts.query });
    }

    /**
     * Get a page project shared component by id.
     * @method GET /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getSharedComponent(pagesProjectId: string, id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{id}', { path: { pages_project_id: pagesProjectId, id }, query: opts.query });
    }

    /**
     * Update a page project shared components by id.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{id}
     * @remarks Any query params may be sent (none documented).
     */
    putSharedComponents(pagesProjectId: string, id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/shared-components/{id}', { path: { pages_project_id: pagesProjectId, id }, body, query: opts.query });
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
    pagesProjects(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/pages-projects', { body, query: opts.query });
    }
}
