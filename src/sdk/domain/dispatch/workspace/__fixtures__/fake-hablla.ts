/**
 * Test doubles for the workspace dispatch integration test: a stateful fake of the Hablla
 * routes the dispatch calls, an in-memory job store with compare-and-set, and a manual
 * clock. Test-only; excluded from the build.
 */

import type { HttpRequest, HttpResponse, HttpTransport } from '../../../../core/types';
import type { Clock, DispatchJobStore } from '../ports';
import type { ContactPage, DispatchContact, DispatchJob, DispatchJobPhase } from '../types';
import { JobNotFoundError, StaleJobError } from '../errors';
import { holdsPersonClaim } from '../person-claims';

/** What the report engine answers while a new segmentation has not propagated (probe 03). */
const AUDIENCE_NOT_PROPAGATED_MESSAGE = 'Erro ao resolver segmentações';

/**
 * Quantity the campaign creation answers: the server resolves the audience after replying,
 * so the 201 body always reports zero and only a later read carries the real quantity
 * (proved by the live validation).
 */
const CREATED_CAMPAIGN_QUANTITY = 0;

export const WORKSPACE_ID = '6a039a45dc0412040ef44b91';
export const WORKSPACE_TOKEN = 'workspace-token';
export const BEARER_HEADER = 'Bearer id-token';

/** A request as the fake saw it. */
export interface RecordedRequest {
    method: string;
    path: string;
    query: URLSearchParams;
    authorization: string | undefined;
    body: any;
}

/** A person held by the fake; a phone may leave `is_whatsapp` undeclared, as some payloads do. */
export interface FakePerson {
    id: string;
    name: string;
    phones: Array<{ phone: string; is_whatsapp?: boolean; type: string }>;
    users: string[];
    followers: string[];
    is_blocked: boolean;
    custom_fields: Array<{ custom_field: string; value: string }>;
    sectors: string[];
}

/**
 * A scripted misbehavior for matching requests, consumed `times` times:
 * `throttle` answers 429, `status` answers the status without applying, `applyThenStatus`
 * applies and answers the status, `reject` throws before applying, `applyThenReject`
 * applies and throws.
 */
export interface Fault {
    matches: (request: RecordedRequest) => boolean;
    kind: 'throttle' | 'status' | 'applyThenStatus' | 'reject' | 'applyThenReject';
    status?: number;
    times: number;
}

/** Stateful fake of the Hablla routes used by the workspace dispatch. */
export class FakeHablla implements HttpTransport {
    readonly requests: RecordedRequest[] = [];
    readonly faults: Fault[] = [];
    users: Array<{ id: string; email: string; name: string }> = [];
    customFields: Array<{ id: string; target: string; type: string; name: string }> = [];
    readonly persons = new Map<string, FakePerson>();
    services: Array<{ id: string; status: string; key: string }> = [];
    readonly segmentations = new Map<string, { name: string; items: Array<{ id: string; person: string }>; countCalls: number }>();
    readonly campaigns: Array<{ id: string; name: string; quantity: number; query: unknown }> = [];
    /** Count calls per segmentation answered with the not-propagated 500. */
    notPropagatedCounts = 1;
    /** When set, a campaign read reports this quantity instead of the audience it resolved. */
    campaignQuantityOverride?: number;
    workspaceTokenRevoked = false;
    bearerTokenRevoked = false;
    /** Called for every request before it is answered. */
    onRequest?: (request: RecordedRequest) => void;
    private nextId = 1;

    /** A fresh 24-hex id. */
    newId(): string {
        return (this.nextId++).toString(16).padStart(24, 'f');
    }

    /** Adds a person and returns it. */
    addPerson(fields: Partial<FakePerson> & { phone: string; whatsapp?: boolean }): FakePerson {
        const person: FakePerson = {
            id: fields.id ?? this.newId(),
            name: fields.name ?? 'EXISTING PERSON',
            phones: fields.phones ?? [{ phone: fields.phone, is_whatsapp: fields.whatsapp ?? true, type: 'personal' }],
            users: fields.users ?? [],
            followers: fields.followers ?? [],
            is_blocked: fields.is_blocked ?? false,
            custom_fields: fields.custom_fields ?? [],
            sectors: fields.sectors ?? [],
        };
        this.persons.set(person.id, person);
        return person;
    }

    /** Requests matching a method and a path suffix. */
    requestsTo(method: string, pathSuffix: RegExp): RecordedRequest[] {
        return this.requests.filter((request) => request.method === method && pathSuffix.test(request.path));
    }

    async send<T>(request: HttpRequest): Promise<HttpResponse<T>> {
        const url = new URL(request.url);
        const recorded: RecordedRequest = {
            method: request.method,
            path: url.pathname,
            query: url.searchParams,
            authorization: request.headers?.Authorization,
            body: request.body,
        };

        this.requests.push(recorded);
        this.onRequest?.(recorded);

        const fault = this.faults.find((candidate) => candidate.times > 0 && candidate.matches(recorded));

        if (fault) {
            fault.times--;
        }

        if (fault?.kind === 'reject') {
            throw new Error('network down');
        }

        if (fault?.kind === 'throttle') {
            return reply(429, { errorCode: 103, message: 'Too many requests, wait one minute' });
        }

        if (fault?.kind === 'status') {
            return reply(fault.status!, { message: 'scripted failure' });
        }

        const response = this.route(recorded);

        if (fault?.kind === 'applyThenReject') {
            throw new Error('socket hang up');
        }

        if (fault?.kind === 'applyThenStatus') {
            return reply(fault.status!, { message: 'scripted failure after apply' });
        }

        return response as HttpResponse<T>;
    }

    /** Answers a request from the fake state. */
    private route(request: RecordedRequest): HttpResponse<unknown> {
        const path = request.path.replace(`/workspaces/${WORKSPACE_ID}`, '');
        const bearerRoute = this.isBearerRoute(request.method, path);
        const expectedHeader = bearerRoute ? BEARER_HEADER : WORKSPACE_TOKEN;
        const revoked = bearerRoute ? this.bearerTokenRevoked : this.workspaceTokenRevoked;

        if (request.authorization !== expectedHeader || revoked) {
            return reply(401, { message: 'Unauthorized', statusCode: 401 });
        }

        const personMatch = path.match(/^\/v1\/persons\/([^/]+)(\/[a-z-]+)?$/);
        const itemsMatch = path.match(/^\/v1\/segmentations\/([^/]+)\/segmentations-items$/);

        if (request.method === 'GET' && path === '/v1/users') {
            return this.page(this.users.map((user) => ({ id: `member-${user.id}`, user: { ...user } })), request.query);
        }

        if (request.method === 'GET' && path === '/v1/custom-fields') {
            return this.page(this.customFields, request.query);
        }

        if (request.method === 'GET' && (path === '/v2/persons' || path === '/v1/persons')) {
            const phone = request.query.get('phone');
            const found = [...this.persons.values()].filter((person) => person.phones.some((entry) => entry.phone === phone));
            const shaped = found.map((person) => (path === '/v2/persons' ? { ...person } : withoutBlocked(person)));
            return this.page(shaped, request.query);
        }

        if (request.method === 'GET' && path === '/v2/services') {
            const statuses = (request.query.get('statuses') ?? '').split(',');
            return this.page(this.services.filter((service) => service.key === request.query.get('key') && statuses.includes(service.status)), request.query);
        }

        if (request.method === 'POST' && path === '/v1/persons') {
            const person = this.addPerson({
                phone: request.body.phones[0].phone,
                phones: request.body.phones,
                name: request.body.name,
                users: [...request.body.users],
                sectors: [...request.body.sectors],
                custom_fields: [...request.body.custom_fields],
            });
            return reply(201, { ...person });
        }

        if (personMatch) {
            return this.updatePerson(personMatch[1]!, personMatch[2], request.body);
        }

        if (request.method === 'POST' && path === '/v1/segmentations') {
            const id = this.newId();
            this.segmentations.set(id, { name: request.body.name, items: [], countCalls: 0 });
            return reply(201, { id, name: request.body.name });
        }

        if (itemsMatch && request.method === 'POST') {
            const segmentation = this.segmentations.get(itemsMatch[1]!)!;
            const item = { id: this.newId(), person: request.body.person };
            segmentation.items.push(item);
            return reply(201, { ...item, segmentation: itemsMatch[1] });
        }

        if (itemsMatch && request.method === 'GET') {
            const segmentation = this.segmentations.get(itemsMatch[1]!)!;
            return this.page(segmentation.items.filter((item) => item.person === request.query.get('person')), request.query);
        }

        if (request.method === 'POST' && path === '/v1/reports/alloy-reports/segmentations/count') {
            return this.count(request.body.filters);
        }

        if (request.method === 'POST' && path === '/v2/campaigns') {
            const quantity = this.campaignQuantityOverride ?? this.audienceOf(request.body.query).size;
            const campaign = { id: this.newId(), name: request.body.name, quantity, query: request.body.query };
            this.campaigns.push(campaign);
            return reply(201, { ...campaign, quantity: CREATED_CAMPAIGN_QUANTITY, status: 'pending' });
        }

        if (request.method === 'GET' && path === '/v1/campaigns') {
            return this.page(this.campaigns.filter((campaign) => campaign.name === request.query.get('name')), request.query);
        }

        throw new Error(`FakeHablla has no route for ${request.method} ${request.path}`);
    }

    /** Routes that only accept the Bearer token. */
    private isBearerRoute(method: string, path: string): boolean {
        return path === '/v1/custom-fields'
            || (method === 'POST' && path === '/v1/segmentations')
            || path === '/v1/reports/alloy-reports/segmentations/count'
            || path === '/v2/campaigns'
            || path === '/v1/campaigns';
    }

    /** Applies a person update. */
    private updatePerson(personId: string, action: string | undefined, body: any): HttpResponse<unknown> {
        const person = this.persons.get(personId);

        if (!person) {
            return reply(404, { message: 'Person not found' });
        }

        switch (action) {
            case undefined:
                for (const field of body.custom_fields) {
                    person.custom_fields = person.custom_fields.filter((entry) => entry.custom_field !== field.custom_field).concat([field]);
                }
                break;
            case '/add-users':
                person.users = [...new Set([...person.users, ...body.users])];
                break;
            case '/remove-users':
                person.users = person.users.filter((user) => !body.users.includes(user));
                break;
            case '/remove-followers':
                person.followers = person.followers.filter((follower) => !body.followers.includes(follower));
                break;
        }

        return reply(200, { ...person });
    }

    /** The audience count, with the not-propagated 500 for the first calls of a segmentation. */
    private count(filters: Array<{ type: string; segmentation?: string }>): HttpResponse<unknown> {
        const segmentationId = filters.find((filter) => filter.type === 'in_segmentation')!.segmentation!;
        const segmentation = this.segmentations.get(segmentationId)!;

        segmentation.countCalls++;

        if (segmentation.countCalls <= this.notPropagatedCounts) {
            return reply(500, { message: AUDIENCE_NOT_PROPAGATED_MESSAGE });
        }

        return reply(200, { count: this.audienceOf(filters).size, not_found: 0 });
    }

    /**
     * Distinct persons matching `in_segmentation` and, when present, `whatsapp`. A phone
     * that leaves `is_whatsapp` undeclared is not ruled out: what a listing omits says
     * nothing about the report engine's own index.
     */
    private audienceOf(filters: Array<{ type: string; segmentation?: string }>): Set<string> {
        const segmentationId = filters.find((filter) => filter.type === 'in_segmentation')!.segmentation!;
        const needsWhatsapp = filters.some((filter) => filter.type === 'whatsapp');
        const persons = new Set<string>();

        for (const item of this.segmentations.get(segmentationId)!.items) {
            const person = this.persons.get(item.person);

            if (person && (!needsWhatsapp || person.phones.some((phone) => phone.is_whatsapp !== false))) {
                persons.add(person.id);
            }
        }

        return persons;
    }

    /** A page of results. */
    private page(results: unknown[], query: URLSearchParams): HttpResponse<unknown> {
        const limit = Number(query.get('limit') ?? 50);
        const page = Number(query.get('page') ?? 1);
        const slice = results.slice((page - 1) * limit, page * limit);

        return reply(200, { results: JSON.parse(JSON.stringify(slice)), count: slice.length, totalItems: results.length, page, limit, totalPages: Math.max(1, Math.ceil(results.length / limit)) });
    }
}

/** A response. */
function reply(status: number, data: unknown): HttpResponse<unknown> {
    return { status, headers: {}, data };
}

/** A person as the v1 listing shows it (no `is_blocked`). */
function withoutBlocked(person: FakePerson): Omit<FakePerson, 'is_blocked'> {
    const { is_blocked: _blocked, ...rest } = person;
    return rest;
}

/** Deep copy through JSON, as a real store would serialize. */
function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

/** In-memory {@link DispatchJobStore} with compare-and-set and a switch to simulate a killed execution. */
export class InMemoryDispatchJobStore implements DispatchJobStore {
    readonly jobs = new Map<string, { job: DispatchJob; contacts: DispatchContact[] }>();
    /** Next `update` calls that fail as if the execution had been killed. */
    killedUpdates = 0;

    async withExclusiveAccess<T>(action: () => Promise<T>): Promise<T> {
        return action();
    }

    async insert(job: DispatchJob, contacts: readonly DispatchContact[]): Promise<DispatchJob> {
        const stored = clone({ ...job, revision: 0 });
        this.jobs.set(job.id, { job: stored, contacts: clone([...contacts]) });
        return clone(stored);
    }

    async load(jobId: string): Promise<DispatchJob> {
        return clone(this.entry(jobId).job);
    }

    async findByFingerprint(fingerprint: string): Promise<DispatchJob[]> {
        return [...this.jobs.values()].filter((entry) => entry.job.fingerprint === fingerprint).map((entry) => clone(entry.job));
    }

    async findByPhases(phases: readonly DispatchJobPhase[]): Promise<DispatchJob[]> {
        return [...this.jobs.values()].filter((entry) => phases.includes(entry.job.phase)).map((entry) => clone(entry.job));
    }

    async loadContacts(jobId: string, page: ContactPage): Promise<DispatchContact[]> {
        return clone(this.entry(jobId).contacts.slice(page.offset, page.offset + page.limit));
    }

    async loadPersonClaims(jobId: string): Promise<ReadonlyMap<string, number>> {
        const claims = new Map<string, number>();

        for (const contact of this.entry(jobId).contacts) {
            if (contact.person && holdsPersonClaim(contact.outcome) && !claims.has(contact.person.id)) {
                claims.set(contact.person.id, contact.index);
            }
        }

        return claims;
    }

    async update(job: DispatchJob, changedContacts: readonly DispatchContact[]): Promise<DispatchJob> {
        if (this.killedUpdates > 0) {
            this.killedUpdates--;
            throw new Error('execution killed');
        }

        const entry = this.entry(job.id);

        if (entry.job.revision !== job.revision) {
            throw new StaleJobError(job.id, job.revision);
        }

        entry.job = clone({ ...job, revision: job.revision + 1 });

        for (const contact of changedContacts) {
            entry.contacts[contact.index] = clone(contact);
        }

        return clone(entry.job);
    }

    /** All contacts of a job. */
    contactsOf(jobId: string): DispatchContact[] {
        return clone(this.entry(jobId).contacts);
    }

    /** Overwrites a stored job header without compare-and-set, as another execution would. */
    overwrite(jobId: string, change: Partial<DispatchJob>): void {
        const entry = this.entry(jobId);
        entry.job = { ...entry.job, ...change, revision: entry.job.revision + 1 };
    }

    /** The stored entry of a job. */
    private entry(jobId: string): { job: DispatchJob; contacts: DispatchContact[] } {
        const entry = this.jobs.get(jobId);

        if (!entry) {
            throw new JobNotFoundError(jobId);
        }

        return entry;
    }
}

/** A clock moved by hand; `sleep` advances it. */
export class FakeClock implements Clock {
    constructor(public current: number) {}

    now(): number {
        return this.current;
    }

    async sleep(ms: number): Promise<void> {
        this.current += ms;
    }
}
