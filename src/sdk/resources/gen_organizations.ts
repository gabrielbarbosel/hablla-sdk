import { Resource } from './base';

/** `organizations` resource (generated from openapi.json). */
export class Organizations extends Resource {
    /**
     * Add person to organization by id.
     * @method PATCH /v1/workspaces/{workspace_id}/organizations/{organization_id}/add-persons
     * @remarks Documented query: persons (extra keys allowed).
     */
    addPersons(organizationId: string, body: Record<string, unknown>, opts: { query?: { persons?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/organizations/{organization_id}/add-persons', { path: { organization_id: organizationId }, body, query: opts.query });
    }

    /**
     * Add tags to org by id.
     * @method PUT /v1/workspaces/{workspace_id}/organizations/{organization_id}/add-tags
     * @remarks Documented query: tags (extra keys allowed).
     */
    addTags(organizationId: string, body: Record<string, unknown>, opts: { query?: { tags?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/organizations/{organization_id}/add-tags', { path: { organization_id: organizationId }, body, query: opts.query });
    }

    /**
     * Get all organization costs.
     * @method GET /v1/workspaces/{workspace_id}/organizations/{organization_id}/costs
     * @remarks Documented query: filters, page, limit, order, direction_order, entity_type, start_date, end_date, populate (extra keys allowed).
     */
    getCosts(organizationId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; entity_type?: string; start_date?: string; end_date?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/organizations/{organization_id}/costs', { path: { organization_id: organizationId }, query: opts.query });
    }

    /**
     * Get all persons by organization id.
     * @method GET /v1/workspaces/{workspace_id}/organizations/{id}/persons
     * @remarks Documented query: page, limit, order, direction_order, search, name, email, phone, tax_id, legal_name, status, updated_at, custom_fields, user, tags, populate (extra keys allowed).
     */
    getPersons(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; search?: string; name?: string; email?: string; phone?: string; tax_id?: string; legal_name?: string; status?: string; updated_at?: string; custom_fields?: string[]; user?: string; tags?: string[]; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/organizations/{id}/persons', { path: { id }, query: opts.query });
    }

    /**
     * Remove person from organization by id.
     * @method PATCH /v1/workspaces/{workspace_id}/organizations/{organization_id}/remove-persons
     * @remarks Documented query: persons (extra keys allowed).
     */
    removePersons(organizationId: string, body: Record<string, unknown>, opts: { query?: { persons?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/organizations/{organization_id}/remove-persons', { path: { organization_id: organizationId }, body, query: opts.query });
    }

    /**
     * Remove tags on organization by id.
     * @method PUT /v1/workspaces/{workspace_id}/organizations/{organization_id}/remove-tags
     * @remarks Documented query: tags (extra keys allowed).
     */
    removeTags(organizationId: string, body: Record<string, unknown>, opts: { query?: { tags?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/organizations/{organization_id}/remove-tags', { path: { organization_id: organizationId }, body, query: opts.query });
    }

    /**
     * Get all organizations segmentations.
     * @method GET /v1/workspaces/{workspace_id}/organizations/{organization_id}/segmentations
     * @remarks Documented query: filters, page, limit, order, direction_order, populate, search (extra keys allowed).
     */
    getSegmentations(organizationId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; populate?: string[]; search?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/organizations/{organization_id}/segmentations', { path: { organization_id: organizationId }, query: opts.query });
    }

    /**
     * Delete organization by id.
     * @method DELETE /v1/workspaces/{workspace_id}/organizations/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteOrganization(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/organizations/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Get organization by id.
     * @method GET /v1/workspaces/{workspace_id}/organizations/{organization_id}
     * @remarks Documented query: filters, populate (extra keys allowed).
     */
    getOrganization(organizationId: string, opts: { query?: { filters?: string; populate?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/organizations/{organization_id}', { path: { organization_id: organizationId }, query: opts.query });
    }

    /**
     * Update organization by id.
     * @method PUT /v1/workspaces/{workspace_id}/organizations/{organization_id}
     * @remarks Documented query: populate (extra keys allowed).
     */
    updateOrganization(organizationId: string, body: Record<string, unknown>, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/organizations/{organization_id}', { path: { organization_id: organizationId }, body, query: opts.query });
    }

    /**
     * Create a new batch action.
     * @method POST /v1/workspaces/{workspace_id}/organizations/batch
     * @remarks Any query params may be sent (none documented).
     */
    batch(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/organizations/batch', { body, query: opts.query });
    }

    /**
     * Check if the if value is duplicate.
     * @method GET /v1/workspaces/{workspace_id}/organizations/check-duplicate
     * @remarks Documented query: email, phone, tax_id, id (extra keys allowed).
     */
    getCheckDuplicate(opts: { query?: { email?: string; phone?: string; tax_id?: string; id?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/organizations/check-duplicate', { query: opts.query });
    }

    /**
     * Create or update a organization.
     * @method POST /v1/workspaces/{workspace_id}/organizations/create-or-update
     * @remarks Any query params may be sent (none documented).
     */
    createOrUpdate(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/organizations/create-or-update', { body, query: opts.query });
    }

    /**
     * Get organization by filter.
     * @method GET /v1/workspaces/{workspace_id}/organizations/filter
     * @remarks Documented query: email, phone, custom_fields, tax_id (extra keys allowed).
     */
    getFilter(opts: { query?: { email?: string; phone?: string; custom_fields?: string[]; tax_id?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/organizations/filter', { query: opts.query });
    }

    /**
     * Organizations merge.
     * @method POST /v1/workspaces/{workspace_id}/organizations/merge
     * @remarks Any query params may be sent (none documented).
     */
    merge(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/organizations/merge', { body, query: opts.query });
    }

    /**
     * Get all organizations.
     * @method GET /v1/workspaces/{workspace_id}/organizations
     * @remarks Documented query: filters, page, limit, order, direction_order, search, name, email, phone, tax_id, legal_name, status, updated_at, custom_fields, user, tags, populate (extra keys allowed).
     */
    listOrganizations(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; search?: string; name?: string; email?: string; phone?: string; tax_id?: string; legal_name?: string; status?: string; updated_at?: string; custom_fields?: string[]; user?: string; tags?: string[]; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/organizations', { query: opts.query });
    }

    /**
     * Create a organization.
     * @method POST /v1/workspaces/{workspace_id}/organizations
     * @remarks Any query params may be sent (none documented).
     */
    createOrganization(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/organizations', { body, query: opts.query });
    }
}
