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
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/add-followers
     * @remarks Any query params may be sent (none documented).
     */
    addFollowers(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/add-followers', { path: { id }, body, query: opts.query });
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
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/add-sectors
     * @remarks Any query params may be sent (none documented).
     */
    addSectors(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/add-sectors', { path: { id }, body, query: opts.query });
    }

    /**
     * Add tags on person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/add-tags
     * @remarks Any query params may be sent (none documented).
     */
    addTags(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/add-tags', { path: { id }, body, query: opts.query });
    }

    /**
     * Add user on person.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/add-users
     * @remarks Any query params may be sent (none documented).
     */
    addUsers(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/add-users', { path: { id }, body, query: opts.query });
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
     * @method PATCH /v1/workspaces/{workspace_id}/persons/{id}/block
     * @remarks Any query params may be sent (none documented).
     */
    patchBlock(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.patch('/v1/workspaces/{workspace_id}/persons/{id}/block', { path: { id }, body, query: opts.query });
    }

    /**
     * Get all persons.
     * @method GET /v1/workspaces/{workspace_id}/persons/{id}/costs
     * @remarks Documented query: filters, page, limit, order, direction_order, entity_type, start_date, end_date, populate (extra keys allowed).
     */
    getCosts(id: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; entity_type?: string; start_date?: string; end_date?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{id}/costs', { path: { id }, query: opts.query });
    }

    /**
     * Get duplicated persons by id.
     * @method GET /v1/workspaces/{workspace_id}/persons/{id}/duplicates
     * @remarks Documented query: page, limit, order, direction_order (extra keys allowed).
     */
    duplicates(id: string, opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{id}/duplicates', { path: { id }, query: opts.query });
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
     * @method GET /v1/workspaces/{workspace_id}/persons/{id}/opened-services
     * @remarks Documented query: connection (extra keys allowed).
     */
    getOpenedServices(id: string, opts: { query?: { connection?: string } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{id}/opened-services', { path: { id }, query: opts.query });
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
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/remove-followers
     * @remarks Any query params may be sent (none documented).
     */
    removeFollowers(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/remove-followers', { path: { id }, body, query: opts.query });
    }

    /**
     * Remove organization on person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/remove-organizations
     * @remarks Any query params may be sent (none documented).
     */
    removeOrganizations(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/remove-organizations', { path: { id }, body, query: opts.query });
    }

    /**
     * Remove sectors from person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/remove-sectors
     * @remarks Any query params may be sent (none documented).
     */
    removeSectors(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/remove-sectors', { path: { id }, body, query: opts.query });
    }

    /**
     * Remove tags from person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/remove-tags
     * @remarks Any query params may be sent (none documented).
     */
    removeTags(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/remove-tags', { path: { id }, body, query: opts.query });
    }

    /**
     * Remove user on person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}/remove-users
     * @remarks Any query params may be sent (none documented).
     */
    removeUsers(id: string, body: Partial<Person>, opts: { query?: Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}/remove-users', { path: { id }, body, query: opts.query });
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
     * @method GET /v1/workspaces/{workspace_id}/persons/{id}/segmentations
     * @remarks Documented query: filters, page, limit, order, direction_order, populate, search (extra keys allowed).
     */
    getSegmentations(id: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; populate?: string[]; search?: string } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{id}/segmentations', { path: { id }, query: opts.query });
    }

    /**
     * Get person services-counters by id.
     * @method GET /v1/workspaces/{workspace_id}/persons/{id}/services-counters
     * @remarks Documented query: status (extra keys allowed).
     */
    getServicesCounters(id: string, opts: { query?: { status?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Person>> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{id}/services-counters', { path: { id }, query: opts.query });
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
     * Get person by id.
     * @method GET /v1/workspaces/{workspace_id}/persons/{id}
     * @remarks Documented query: populate (extra keys allowed).
     */
    getPerson(id: string, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Person> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Update person by id.
     * @method PUT /v1/workspaces/{workspace_id}/persons/{id}
     * @remarks Documented query: populate (extra keys allowed).
     */
    updatePerson(id: string, body: Partial<Person>, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Person> {
        return this.http.put('/v1/workspaces/{workspace_id}/persons/{id}', { path: { id }, body, query: opts.query });
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
     * Finishes all open attendances (services) of a person, across every
     * connection. An open service holds a per-connection lock on the phone
     * (key = `{connection}_{phone}`); while it exists, creating a person or
     * sending to that phone throws 409 (errorCode 136). Deleting/merging a person
     * does NOT finish their services — it transfers them (still open), so the lock
     * lingers on the anchor. {@link deletePerson} calls this first so a delete
     * never leaves a locked phone or an orphaned attendance behind.
     * @returns ids of the services that were finished.
     */
    async finishServices(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<string[]> {
        const res = await this.http.get<{ results?: Array<{ id: string; status?: string }> }>(
            '/v2/workspaces/{workspace_id}/services',
            { query: { person: id, limit: 50, ...opts.query } },
        );
        const open = (res.results ?? []).filter((s) => s.status !== 'finished');
        for (const s of open) {
            await this.http.patch('/v1/workspaces/{workspace_id}/services/{service_id}/action', {
                path: { service_id: s.id },
                body: { status: 'finished' },
            });
        }
        return open.map((s) => s.id);
    }

    /**
     * Deletes a person. The Hablla API has no direct DELETE for persons, so this
     * uses {@link merge} as the documented workaround: the target becomes
     * `replaced_person` and is removed, while the anchor person is kept with its
     * own data (merge_data). Ported from the legacy generator's custom
     * deletePersonApi so the capability lives in the new SDK.
     *
     * Before merging it calls {@link finishServices} so no open attendance (and
     * its phone lock) is carried onto the anchor. Compose further cleanup here if
     * more things ever need to be released before a delete.
     * @param id person to delete (becomes `replaced_person`).
     * @param opts.anchorId person to keep. Defaults to the first other person —
     *   pass an explicit, disposable anchor (ideally a dedicated trash person) in
     *   production to avoid polluting a real record with the merged owners.
     */
    async deletePerson(id: string, opts: { anchorId?: string; query?: Record<string, unknown> } = {}): Promise<Person> {
        const target = await this.getPerson(id);
        if (!target) throw new Error(`Person '${id}' not found`);

        // Release everything the delete must not carry forward (open attendances /
        // phone locks). Add more cleanup primitives here as needed.
        await this.finishServices(id);

        let anchor: Person | undefined;
        if (opts.anchorId) {
            anchor = await this.getPerson(opts.anchorId);
        } else {
            // Default to the dedicated trash person so merged owners never pollute a
            // real record. Falls back to any other person if the trash isn't set up.
            const { results } = await this.listPersons({ query: { search: 'Lixeira do Sistema', limit: 5 } });
            anchor = (results ?? []).find((p) => p.id !== id && typeof p.name === 'string' && p.name.includes('Lixeira do Sistema'));
            if (!anchor) {
                const fallback = await this.listPersons({ query: { limit: 5 } });
                anchor = (fallback.results ?? []).find((p) => p.id !== id);
            }
        }
        const anchorId = anchor?.id;
        if (!anchor || !anchorId || anchorId === id) {
            throw new Error('No anchor person available for merge-delete');
        }

        return this.merge(
            {
                person: anchorId,
                replaced_person: id,
                merge_data: {
                    name: anchor.name,
                    emails: anchor.emails ?? [],
                    phones: anchor.phones ?? [],
                    custom_fields: anchor.custom_fields ?? [],
                },
            } as Partial<Person>,
            { query: opts.query },
        );
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
     * Get person by webchat id.
     * @method GET /v1/workspaces/{workspace_id}/persons/webchat/{webchat_id}
     * @remarks Documented query: populate (extra keys allowed).
     */
    getWebchat(webchatId: string, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Person> {
        return this.http.get('/v1/workspaces/{workspace_id}/persons/webchat/{webchat_id}', { path: { webchat_id: webchatId }, query: opts.query });
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
