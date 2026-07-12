import { Resource } from './base';
import type { Paged } from '../core/types';

/** A person (contact). */
export interface Person {
    id: string;
    name?: string;
    emails?: unknown;
    phones?: unknown;
    instagrams?: unknown;
    facebooks?: unknown;
    users?: unknown;
    followers?: unknown;
    sectors?: unknown;
    workspace?: string;
    workspace_id?: string;
    duplicate_keys?: unknown;
    custom_fields?: unknown;
    organizations?: unknown;
    tags?: unknown;
    sla_config_id?: unknown;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

/** `persons` resource (generated from openapi.json). */
export class Persons extends Resource {
    /**
     * Add email to person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/add-emails
     * @remarks Any query params may be sent (none documented).
     */
    addEmails(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/add-emails', { path: { id }, body, query: opts.query });
    }

    /**
     * Add followers to person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{person_id}/add-followers
     * @remarks Any query params may be sent (none documented).
     */
    addFollowers(personId: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{person_id}/add-followers', { path: { person_id: personId }, body, query: opts.query });
    }

    /**
     * Add organization to person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/add-organizations
     * @remarks Any query params may be sent (none documented).
     */
    addOrganizations(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/add-organizations', { path: { id }, body, query: opts.query });
    }

    /**
     * Add phones to person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/add-phones
     * @remarks Any query params may be sent (none documented).
     */
    addPhones(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/add-phones', { path: { id }, body, query: opts.query });
    }

    /**
     * Add sector to person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{person_id}/add-sectors
     * @remarks Any query params may be sent (none documented).
     */
    addSectors(personId: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{person_id}/add-sectors', { path: { person_id: personId }, body, query: opts.query });
    }

    /**
     * Add tags on person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{person_id}/add-tags
     * @remarks Any query params may be sent (none documented).
     */
    addTags(personId: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{person_id}/add-tags', { path: { person_id: personId }, body, query: opts.query });
    }

    /**
     * Add user on person.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{person_id}/add-users
     * @remarks Any query params may be sent (none documented).
     */
    addUsers(personId: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{person_id}/add-users', { path: { person_id: personId }, body, query: opts.query });
    }

    /**
     * Add a new webchat_id on person by id.
     * @method PATCH /v1/workspaces/{workspace_id}/persons/{id}/add-webchat
     * @remarks Any query params may be sent (none documented).
     */
    addWebchat(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.patch('/v1/workspaces/{workspace_id}/persons/{id}/add-webchat', { path: { id }, body, query: opts.query });
    }

    /**
     * Block person by id.
     * @method PATCH /v1/workspaces/{workspace_id}/persons/{person_id}/block
     * @remarks Any query params may be sent (none documented).
     */
    patchBlock(personId: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.patch('/v1/workspaces/{workspace_id}/persons/{person_id}/block', { path: { person_id: personId }, body, query: opts.query });
    }

    /**
     * Get all persons.
     * @method GET /v1/workspaces/{workspace_id}/persons/{person_id}/costs
     * @remarks Documented query: filters, page, limit, order, direction_order, entity_type, start_date, end_date, populate (extra keys allowed).
     */
    getCosts(personId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; entity_type?: string; start_date?: string; end_date?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{person_id}/costs', { path: { person_id: personId }, query: opts.query });
    }

    /**
     * Get duplicated persons by id.
     * @method GET /v1/workspaces/{workspace_id}/persons/{person_id}/duplicates
     * @remarks Documented query: page, limit, order, direction_order (extra keys allowed).
     */
    getDuplicates(personId: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{person_id}/duplicates', { path: { person_id: personId }, query: opts.query });
    }

    /**
     * Get email from person by id.
     * @method GET /v1/workspaces/{workspace_id}/persons/{id}/emails
     * @remarks Documented query: page, limit, order, direction_order, to, subject, text, user, person, service, populate (extra keys allowed).
     */
    getEmails(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; to?: string; subject?: string; text?: string; user?: string; person?: string; service?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{id}/emails', { path: { id }, query: opts.query });
    }

    /**
     * Get person opened-services by id.
     * @method GET /v1/workspaces/{workspace_id}/persons/{person_id}/opened-services
     * @remarks Documented query: connection (extra keys allowed).
     */
    getOpenedServices(personId: string, opts: { query?: { connection?: string } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{person_id}/opened-services', { path: { person_id: personId }, query: opts.query });
    }

    /**
     * Remove email from person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/remove-email
     * @remarks Any query params may be sent (none documented).
     */
    removeEmail(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/remove-email', { path: { id }, body, query: opts.query });
    }

    /**
     * Remove followers from person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{person_id}/remove-followers
     * @remarks Any query params may be sent (none documented).
     */
    removeFollowers(personId: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{person_id}/remove-followers', { path: { person_id: personId }, body, query: opts.query });
    }

    /**
     * Remove organization on person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{person_id}/remove-organizations
     * @remarks Any query params may be sent (none documented).
     */
    removeOrganizations(personId: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{person_id}/remove-organizations', { path: { person_id: personId }, body, query: opts.query });
    }

    /**
     * Remove sectors from person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{person_id}/remove-sectors
     * @remarks Any query params may be sent (none documented).
     */
    removeSectors(personId: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{person_id}/remove-sectors', { path: { person_id: personId }, body, query: opts.query });
    }

    /**
     * Remove tags from person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{person_id}/remove-tags
     * @remarks Any query params may be sent (none documented).
     */
    removeTags(personId: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{person_id}/remove-tags', { path: { person_id: personId }, body, query: opts.query });
    }

    /**
     * Remove user on person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{person_id}/remove-users
     * @remarks Any query params may be sent (none documented).
     */
    removeUsers(personId: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{person_id}/remove-users', { path: { person_id: personId }, body, query: opts.query });
    }

    /**
     * Remove a webchat from person by webchat_id.
     * @method PATCH /v1/workspaces/{workspace_id}/persons/{id}/remove-webchat
     * @remarks Any query params may be sent (none documented).
     */
    removeWebchat(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.patch('/v1/workspaces/{workspace_id}/persons/{id}/remove-webchat', { path: { id }, body, query: opts.query });
    }

    /**
     * Get all persons segmentations.
     * @method GET /v1/workspaces/{workspace_id}/persons/{person_id}/segmentations
     * @remarks Documented query: filters, page, limit, order, direction_order, populate, search (extra keys allowed).
     */
    getSegmentations(personId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; populate?: string[]; search?: string } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{person_id}/segmentations', { path: { person_id: personId }, query: opts.query });
    }

    /**
     * Get person services-counters by id.
     * @method GET /v1/workspaces/{workspace_id}/persons/{person_id}/services-counters
     * @remarks Documented query: status (extra keys allowed).
     */
    getServicesCounters(personId: string, opts: { query?: { status?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{person_id}/services-counters', { path: { person_id: personId }, query: opts.query });
    }

    /**
     * Add user (by phone) to person by id.
     * @method PATCH /v1/workspaces/{workspace_id}/persons/{id}/take
     * @remarks Any query params may be sent (none documented).
     */
    patchTake(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.patch('/v1/workspaces/{workspace_id}/persons/{id}/take', { path: { id }, body, query: opts.query });
    }

    /**
     * Update an webchat on person by webchat_id.
     * @method PATCH /v1/workspaces/{workspace_id}/persons/{id}/update-webchat
     * @remarks Any query params may be sent (none documented).
     */
    updateWebchat(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.patch('/v1/workspaces/{workspace_id}/persons/{id}/update-webchat', { path: { id }, body, query: opts.query });
    }

    /**
     * Get person by webchat id.
     * @method GET /v1/workspaces/{workspace_id}/persons/webchat/{webchat_id}
     * @remarks Documented query: populate (extra keys allowed).
     */
    getWebchat(webchatId: string, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Person> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/webchat/{webchat_id}', { path: { webchat_id: webchatId }, query: opts.query });
    }

    /**
     * Get person by id.
     * @method GET /v1/workspaces/{workspace_id}/persons/{person_id}
     * @remarks Documented query: populate (extra keys allowed).
     */
    getPerson(personId: string, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Person> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{person_id}', { path: { person_id: personId }, query: opts.query });
    }

    /**
     * Update person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{person_id}
     * @remarks Documented query: populate (extra keys allowed).
     */
    updatePerson(personId: string, body: Partial<Person>, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{person_id}', { path: { person_id: personId }, body, query: opts.query });
    }

    /**
     * Associate a UUID with a person.
     * @method POST /v1/workspaces/{workspace_id}/persons/associate-uuid
     * @remarks Any query params may be sent (none documented).
     */
    associateUuid(body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.post('/v1/workspaces/{workspace_id}/persons/associate-uuid', { body, query: opts.query });
    }

    /**
     * Create a new batch action.
     * @method POST /v1/workspaces/{workspace_id}/persons/batch
     * @remarks Any query params may be sent (none documented).
     */
    batch(body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.post('/v1/workspaces/{workspace_id}/persons/batch', { body, query: opts.query });
    }

    /**
     * Check if the if value is duplicate.
     * @method GET /v1/workspaces/{workspace_id}/persons/check-duplicate
     * @remarks Documented query: filters, email, phone, ssn, id (extra keys allowed).
     */
    getCheckDuplicate(opts: { query?: { filters?: string; email?: string; phone?: string; ssn?: string; id?: string } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/check-duplicate', { query: opts.query });
    }

    /**
     * Create or update a person.
     * @method POST /v1/workspaces/{workspace_id}/persons/create-or-update
     * @remarks Any query params may be sent (none documented).
     */
    createOrUpdate(body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.post('/v1/workspaces/{workspace_id}/persons/create-or-update', { body, query: opts.query });
    }

    /**
     * Get person by filter.
     * @method GET /v1/workspaces/{workspace_id}/persons/filter
     * @remarks Documented query: email, phone, custom_fields, ssn (extra keys allowed).
     */
    getFilter(opts: { query?: { email?: string; phone?: string; custom_fields?: string[]; ssn?: string } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/filter', { query: opts.query });
    }

    /**
     * Person merge.
     * @method POST /v1/workspaces/{workspace_id}/persons/merge
     * @remarks Any query params may be sent (none documented).
     */
    merge(body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.post('/v1/workspaces/{workspace_id}/persons/merge', { body, query: opts.query });
    }

    /**
     * Unsubscribe a key.
     * @method POST /v1/workspaces/{workspace_id}/persons/unsubscribe
     * @remarks Any query params may be sent (none documented).
     */
    unsubscribe(body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.post('/v1/workspaces/{workspace_id}/persons/unsubscribe', { body, query: opts.query });
    }

    /**
     * Get all persons.
     * @method GET /v1/workspaces/{workspace_id}/persons
     * @remarks Documented query: page, limit, next, previous, order, direction_order, name, email, phone, search, full_search, start_date, end_date, field_date, updated_at, custom_fields, has_duplicate_keys, is_blocked, customer_status, organization, tags, populate, ssn, users (extra keys allowed).
     */
    listPersonsV1(opts: { query?: { page?: string; limit?: number; next?: string; previous?: string; order?: string; direction_order?: string; name?: string; email?: string; phone?: string; search?: string; full_search?: boolean; start_date?: string; end_date?: string; field_date?: string; updated_at?: string; custom_fields?: string[]; has_duplicate_keys?: boolean; is_blocked?: boolean; customer_status?: string; organization?: string; tags?: string[]; populate?: string[]; ssn?: string; users?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons', { query: opts.query });
    }

    /**
     * Create a new person.
     * @method POST /v1/workspaces/{workspace_id}/persons
     * @remarks Any query params may be sent (none documented).
     */
    createPerson(body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.post('/v1/workspaces/{workspace_id}/persons', { body, query: opts.query });
    }

    /**
     * Get all persons (V2).
     * @method GET /v2/workspaces/{workspace_id}/persons
     * @remarks Documented query: filters, page, limit, next, previous, order, direction_order, name, email, phone, search, full_search, start_date, end_date, field_date, updated_at, custom_fields, has_duplicate_keys, is_blocked, customer_status, organization, tags, populate, ssn, users (extra keys allowed).
     */
    listPersons(opts: { query?: { filters?: string; page?: string; limit?: number; next?: string; previous?: string; order?: string; direction_order?: string; name?: string; email?: string; phone?: string; search?: string; full_search?: boolean; start_date?: string; end_date?: string; field_date?: string; updated_at?: string; custom_fields?: string[]; has_duplicate_keys?: boolean; is_blocked?: boolean; customer_status?: string; organization?: string; tags?: string[]; populate?: string[]; ssn?: string; users?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v2/workspaces/{workspace_id}/persons', { query: opts.query });
    }
}
