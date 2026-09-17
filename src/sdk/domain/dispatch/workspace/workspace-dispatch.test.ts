import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceDispatch } from './workspace-dispatch';
import { TransportCallExecutor } from '../../../core/call-executor';
import {
    AUDIENCE_READY_TIMEOUT_MS,
    CALL_RETRY_DELAY_MS,
    CHUNK_TIME_RESERVE_MS,
    EXCLUSION_PAGE_LIMIT,
    RECONCILIATION_DELAY_MS,
    THROTTLE_COOLDOWN_MS,
    TRANSPORT_COOLDOWN_MS,
} from './constants';
import { ESTIMATED_CALLS_PER_CONTACT } from './call-budget';
import {
    CallBudgetExceededError,
    DispatchThrottledError,
    DispatchTransportError,
    DispatchValidationError,
    DuplicateDispatchError,
    InvalidJobTransitionError,
    JobBusyError,
} from './errors';
import { BEARER_HEADER, FakeClock, FakeHablla, InMemoryDispatchJobStore, WORKSPACE_ID, WORKSPACE_TOKEN, type FakePerson } from './__fixtures__/fake-hablla';
import { ADVISOR, CONNECTION_ID, FIRST_NAME_FIELD_ID, OTHER_ADVISOR, RESERVE_OWNER, ROSTER_USERS, SYSTEM_USER, aRequest, aRow, habllaId } from './__fixtures__/builders';
import type { DispatchProgress, WorkspaceDispatchRequest } from './types';

const START = 1_800_000_000_000;
const OPERATOR = { operatorEmail: 'operator@example.com' };
const EXECUTION_BUDGET_MS = 300_000;
const LEASE_SLACK_MS = 90_000;
const MAX_CONTINUATIONS = 200;

let hablla: FakeHablla;
let store: InMemoryDispatchJobStore;
let clock: FakeClock;
let dispatch: WorkspaceDispatch;
let bearerAuthorizationFailure: Error | undefined;

/** Builds the dispatch over the fakes, with limits that never bind unless given. */
function buildDispatch(dailyCallQuota = 1_000_000, concurrency = 16, maxExclusionPages = 10): WorkspaceDispatch {
    const auth = {
        authorization: async (strategy: string) => {
            if (strategy === 'bearer' && bearerAuthorizationFailure) {
                throw bearerAuthorizationFailure;
            }
            return strategy === 'bearer' ? BEARER_HEADER : WORKSPACE_TOKEN;
        },
    };
    const executor = new TransportCallExecutor(hablla, auth, { baseUrl: 'https://api.test', workspaceId: WORKSPACE_ID, concurrency });

    return new WorkspaceDispatch({ executor, store, clock }, { dailyCallQuota, maxExclusionPages });
}

beforeEach(() => {
    hablla = new FakeHablla();
    hablla.users = ROSTER_USERS.map((user) => ({ ...user }));
    hablla.customFields = [{ id: FIRST_NAME_FIELD_ID, target: 'person', type: 'string', name: 'Primeiro Nome' }];
    store = new InMemoryDispatchJobStore();
    clock = new FakeClock(START);
    bearerAuthorizationFailure = undefined;
    dispatch = buildDispatch();
});

/** The execution window of a continuation started now. */
function windowNow(budgetMs = EXECUTION_BUDGET_MS) {
    return { deadlineAt: clock.now() + budgetMs, leaseUntil: clock.now() + budgetMs + LEASE_SLACK_MS };
}

/** Runs continuations, honoring each requested delay, until the job waits for confirmation or is over. */
async function drive(progress: DispatchProgress, budgetMs = EXECUTION_BUDGET_MS): Promise<DispatchProgress> {
    let current = progress;

    for (let continuation = 0; current.next.kind === 'continueAfter'; continuation++) {
        if (continuation > MAX_CONTINUATIONS) {
            throw new Error(`job ${current.job.id} did not settle (phase ${current.job.phase})`);
        }

        clock.current += current.next.delayMs;
        current = await dispatch.continue(current.job.id, windowNow(budgetMs));
    }

    return current;
}

/** Plans, confirms and drives a request to its end. */
async function dispatchToEnd(request: WorkspaceDispatchRequest): Promise<DispatchProgress> {
    const planned = await drive(await dispatch.plan(request));
    return drive(await dispatch.start(planned.job.id, OPERATOR));
}

/** A 13-digit phone `5551999<suffix>`. */
function phoneOf(suffix: string): string {
    return `5551999${suffix.padStart(6, '0')}`;
}

/** Contacts of a job by outcome, as `index:outcome`. */
function outcomesOf(jobId: string): string[] {
    return store.contactsOf(jobId).map((contact) => `${contact.index}:${contact.outcome}`);
}

/** The person holding a phone in the fake. */
function personWithPhone(phone: string): FakePerson[] {
    return [...hablla.persons.values()].filter((person) => person.phones.some((entry) => entry.phone === phone));
}

describe('WorkspaceDispatch happy path', () => {
    /** Eight contacts covering every owner and lookup situation. */
    function mixedAudience(): WorkspaceDispatchRequest {
        hablla.addPerson({ id: habllaId('b'), phone: phoneOf('2'), users: [SYSTEM_USER.id] });
        hablla.addPerson({ id: habllaId('c'), phone: phoneOf('3'), users: [OTHER_ADVISOR.id] });
        hablla.addPerson({ id: habllaId('d'), phone: phoneOf('4'), users: [ADVISOR.id] });
        hablla.services.push({ id: 'service-d', status: 'in_attendance', key: `${CONNECTION_ID}_${phoneOf('4')}` });
        hablla.addPerson({ id: habllaId('e1'), phone: phoneOf('5') });
        hablla.addPerson({ id: habllaId('e2'), phone: phoneOf('5') });

        return aRequest({
            rows: [
                aRow('1', { name: 'ana nova' }),
                aRow('2', { name: 'bruno sistema' }),
                aRow('3', { name: 'carla humana' }),
                aRow('4', { name: 'diego atendimento' }),
                aRow('5', { name: 'eva duplicada' }),
                aRow('6', { name: 'fabio excluido' }),
                aRow('7', { name: 'gil reserva', advisorKey: '' }),
                aRow('8', { name: 'hugo sistema', advisorKey: SYSTEM_USER.email }),
            ],
            exclusion: { phones: [phoneOf('6')], segmentationFilters: [] },
        });
    }

    it('sends one campaign to everyone who reached the audience, with workspace for O(N) and Bearer for O(1)', async () => {
        const planned = await drive(await dispatch.plan(mixedAudience()));

        expect(planned.next).toEqual({ kind: 'awaitConfirmation' });
        expect(planned.job.counts).toMatchObject({ ready: 5, excluded: 1, inAttendance: 1, duplicatePersons: 1, pendingLookup: 0 });

        const done = await drive(await dispatch.start(planned.job.id, OPERATOR));

        expect(done.next).toEqual({ kind: 'finished' });
        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 5, campaignQuantity: 5, warnings: [], dispatchConfig: { batch_size: 5, batch_interval: 10 / 60 } });
        expect(done.job.counts).toMatchObject({ inAudience: 5, ready: 0 });
        expect(outcomesOf(done.job.id)).toEqual(['0:inAudience', '1:inAudience', '2:inAudience', '3:inAttendance', '4:duplicatePersons', '5:excluded', '6:inAudience', '7:inAudience']);

        for (const request of hablla.requests) {
            const bearer = /custom-fields|\/segmentations$|alloy-reports|campaigns/.test(request.path) && !request.path.includes('segmentations-items');
            expect(request.authorization, `${request.method} ${request.path}`).toBe(bearer ? BEARER_HEADER : WORKSPACE_TOKEN);
        }

        const bearerRequests = hablla.requests.filter((request) => request.authorization === BEARER_HEADER);
        expect(bearerRequests.map((request) => `${request.method} ${request.path.replace(`/workspaces/${WORKSPACE_ID}`, '')}`)).toEqual([
            'GET /v1/custom-fields',
            'POST /v1/segmentations',
            'POST /v1/reports/alloy-reports/segmentations/count',
            'POST /v1/reports/alloy-reports/segmentations/count',
            'POST /v2/campaigns',
            'GET /v1/campaigns',
        ]);

        const created = personWithPhone(phoneOf('1'))[0]!;
        expect(created).toMatchObject({ name: 'ANA NOVA', users: [ADVISOR.id], custom_fields: [{ custom_field: FIRST_NAME_FIELD_ID, value: 'Ana' }] });
        expect(personWithPhone(phoneOf('7'))[0]!.users).toEqual([RESERVE_OWNER.id]);
        expect(personWithPhone(phoneOf('8'))[0]!.users).toEqual([RESERVE_OWNER.id]);
        expect(hablla.persons.get(habllaId('b'))!.users).toEqual([ADVISOR.id]);
        expect(hablla.persons.get(habllaId('c'))!.users).toEqual([OTHER_ADVISOR.id]);
        expect(hablla.persons.get(habllaId('c'))!.custom_fields).toEqual([{ custom_field: FIRST_NAME_FIELD_ID, value: 'Carla' }]);
        expect(hablla.persons.get(habllaId('b'))!.name).toBe('EXISTING PERSON');
        expect(hablla.requestsTo('POST', /\/persons$/)).toHaveLength(3);
        expect(hablla.requestsTo('PUT', /add-users$/)).toHaveLength(1);
        expect(hablla.requestsTo('PUT', /remove-users$/)).toHaveLength(1);
        expect(hablla.campaigns).toHaveLength(1);
    });

    it('adds the advisor beside system owners under the add policy, without removing them', async () => {
        const request = { ...mixedAudience(), systemOwnerPolicy: 'add' as const };
        const done = await dispatchToEnd(request);

        expect(done.job.phase).toBe('completed');
        expect(hablla.requestsTo('PUT', /remove-users$/)).toHaveLength(0);
        expect(hablla.persons.get(habllaId('b'))!.users).toEqual([SYSTEM_USER.id, ADVISOR.id]);
    });

    it('skips unresolved advisors without any call for them under the skip policy', async () => {
        const request = aRequest({ unresolvedAdvisorPolicy: { kind: 'skip' }, rows: [aRow('1'), aRow('7', { advisorKey: '' })] });
        const done = await dispatchToEnd(request);

        expect(outcomesOf(done.job.id)).toEqual(['0:inAudience', '1:unresolvedAdvisor']);
        expect(hablla.requests.some((request) => request.query.get('phone')?.includes('999000007'))).toBe(false);
    });
});

describe('WorkspaceDispatch exclusion by filter', () => {
    /** A request that excludes everyone in `segmentation`. */
    function excluding(segmentation: string, rows: readonly ReturnType<typeof aRow>[]): WorkspaceDispatchRequest {
        return aRequest({ rows: [...rows], exclusion: { phones: [], segmentationFilters: [{ type: 'in_segmentation', segmentation }] } });
    }

    /** A segmentation the report engine already knows, holding `filler` other persons and then one person per phone. */
    function anExclusionUniverse(filler: number, phones: readonly string[]): string {
        const fillerIds = Array.from({ length: filler }, (_unused, position) => hablla.addPerson({ phone: phoneOf(`9${position}`) }).id);
        const matchingIds = phones.map((phone) => hablla.addPerson({ phone, users: [ADVISOR.id] }).id);

        return hablla.addPropagatedSegmentation([...fillerIds, ...matchingIds]);
    }

    /** Requests that wrote anything to a person. */
    function writesToPerson(personId: string): number {
        return hablla.requests.filter((request) => request.method !== 'GET' && request.path.includes(personId)).length
            + hablla.requestsTo('POST', /segmentations-items$/).filter((request) => request.body.person === personId).length;
    }

    it('excludes a contact before the preview and never writes to it', async () => {
        const universe = anExclusionUniverse(0, [phoneOf('2')]);
        const excludedPerson = personWithPhone(phoneOf('2'))[0]!;
        const planned = await drive(await dispatch.plan(excluding(universe, [aRow('1'), aRow('2')])));

        expect(planned.next).toEqual({ kind: 'awaitConfirmation' });
        expect(planned.job.counts).toMatchObject({ excluded: 1, ready: 1, pendingLookup: 0 });

        const done = await drive(await dispatch.start(planned.job.id, OPERATOR));

        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 1, campaignQuantity: 1, warnings: [] });
        expect(outcomesOf(done.job.id)).toEqual(['0:inAudience', '1:excluded']);
        expect(writesToPerson(excludedPerson.id)).toBe(0);
        expect(excludedPerson.custom_fields).toEqual([]);
        expect(excludedPerson.users).toEqual([ADVISOR.id]);
    });

    it('excludes whoever entered the filter after the preview, still before any write', async () => {
        const universe = anExclusionUniverse(0, []);
        const person = hablla.addPerson({ phone: phoneOf('2'), users: [ADVISOR.id] });
        const planned = await drive(await dispatch.plan(excluding(universe, [aRow('1'), aRow('2')])));

        expect(planned.job.counts).toMatchObject({ excluded: 0, ready: 2 });

        hablla.segmentations.get(universe)!.items.push({ id: hablla.newId(), person: person.id });

        const done = await drive(await dispatch.start(planned.job.id, OPERATOR));

        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 1, campaignQuantity: 1, revalidationShifts: { excluded: 1 } });
        expect(outcomesOf(done.job.id)).toEqual(['0:inAudience', '1:excluded']);
        expect(writesToPerson(person.id)).toBe(0);
    });

    it('reads every page of the filter, so nobody on a later page is dispatched to', async () => {
        const universe = anExclusionUniverse(EXCLUSION_PAGE_LIMIT, [phoneOf('2')]);
        const planned = await drive(await dispatch.plan(excluding(universe, [aRow('1'), aRow('2')])));

        expect(hablla.requestsTo('POST', /message-stats\/list$/).map((request) => request.query.get('page'))).toEqual(['1', '2']);
        expect(planned.job.counts).toMatchObject({ excluded: 1, ready: 1 });
        expect(planned.job.exclusionCursor).toBeUndefined();
    });

    it('fails the run loud when the pages end short of the universe it counted', async () => {
        const universe = anExclusionUniverse(EXCLUSION_PAGE_LIMIT + 499, [phoneOf('2')]);

        hablla.shortListingPages.add(1);

        const planned = await drive(await dispatch.plan(excluding(universe, [aRow('1'), aRow('2')])));

        expect(planned.job).toMatchObject({ phase: 'failed', failure: { reason: 'exclusion_incomplete', resumePhase: 'resolvingExclusions' } });
        expect(hablla.requestsTo('POST', /message-stats\/list$/).map((request) => request.query.get('page'))).toEqual(['1']);
        expect(outcomesOf(planned.job.id)).toEqual(['0:pendingLookup', '1:pendingLookup']);
    });

    it('reads the whole listing again when an incomplete run is resumed', async () => {
        const universe = anExclusionUniverse(EXCLUSION_PAGE_LIMIT + 499, [phoneOf('2')]);

        hablla.shortListingPages.add(1);

        const planned = await drive(await dispatch.plan(excluding(universe, [aRow('1'), aRow('2')])));

        hablla.shortListingPages.clear();

        const resumed = await drive(await dispatch.start(planned.job.id, OPERATOR));

        expect(hablla.requestsTo('POST', /message-stats\/list$/).map((request) => request.query.get('page'))).toEqual(['1', '1', '2']);
        expect(resumed.job).toMatchObject({ phase: 'awaitingConfirmation', counts: expect.objectContaining({ excluded: 1, ready: 1 }) });
    });

    it('keeps the page cursor between executions and resumes the phase where it stopped', async () => {
        const universe = anExclusionUniverse(EXCLUSION_PAGE_LIMIT, [phoneOf('2')]);

        hablla.faults.push({ matches: (request) => request.path.endsWith('/message-stats/list') && request.query.get('page') === '2', kind: 'status', status: 500, times: 1 });

        const planned = await dispatch.plan(excluding(universe, [aRow('1'), aRow('2')]));
        const stopped = await dispatch.continue(planned.job.id, windowNow());

        expect(stopped.job).toMatchObject({ phase: 'resolvingExclusions', exclusionPurpose: 'preview', exclusionCursor: 2, exclusionAttempts: 1 });
        expect(stopped.next).toEqual({ kind: 'continueAfter', delayMs: TRANSPORT_COOLDOWN_MS });
        expect(await dispatch.resumableJobIds()).toEqual([planned.job.id]);
        expect(outcomesOf(planned.job.id)).toEqual(['0:pendingLookup', '1:pendingLookup']);

        clock.current += TRANSPORT_COOLDOWN_MS;

        const resumed = await drive(await dispatch.continue(planned.job.id, windowNow()));

        expect(hablla.requestsTo('POST', /message-stats\/list$/).map((request) => request.query.get('page'))).toEqual(['1', '2', '2']);
        expect(resumed.job.counts).toMatchObject({ excluded: 1, ready: 1 });
    });

    it('charges the exclusion pages to the call budget', async () => {
        const universe = anExclusionUniverse(0, [phoneOf('2')]);
        const withoutExclusion = await dispatch.plan(aRequest({ rows: [aRow('1')] }));
        const bearerBefore = hablla.requests.filter((request) => request.authorization === BEARER_HEADER).length;

        await dispatch.abandon(withoutExclusion.job.id, OPERATOR);
        dispatch = buildDispatch(bearerBefore + ESTIMATED_CALLS_PER_CONTACT + 40);

        await expect(dispatch.plan(excluding(universe, [aRow('1')]))).rejects.toBeInstanceOf(CallBudgetExceededError);
    });

    it('refuses the plan when the filter needs more pages than configured', async () => {
        const universe = anExclusionUniverse(EXCLUSION_PAGE_LIMIT, []);

        dispatch = buildDispatch(1_000_000, 16, 1);

        await expect(dispatch.plan(excluding(universe, [aRow('1')]))).rejects.toThrow(/more than the 1 pages/);
        expect(store.jobs.size).toBe(0);
        expect(hablla.requestsTo('POST', /message-stats\/list$/)).toEqual([]);
    });

    it('fails the job loud when the filter outgrows the ceiling after the plan', async () => {
        const universe = anExclusionUniverse(EXCLUSION_PAGE_LIMIT - 1, []);

        dispatch = buildDispatch(1_000_000, 16, 1);

        const planned = await dispatch.plan(excluding(universe, [aRow('1')]));

        hablla.segmentations.get(universe)!.items.push({ id: hablla.newId(), person: hablla.addPerson({ phone: phoneOf('7') }).id });

        const failed = await drive(await dispatch.continue(planned.job.id, windowNow()));

        expect(failed.job).toMatchObject({ phase: 'failed', failure: { reason: 'exclusion_too_large', resumePhase: 'resolvingExclusions' } });
        expect(outcomesOf(planned.job.id)).toEqual(['0:pendingLookup']);
    });

    it('completes without a campaign when the filter excludes everyone', async () => {
        const universe = anExclusionUniverse(0, [phoneOf('1')]);
        const planned = await drive(await dispatch.plan(excluding(universe, [aRow('1')])));

        expect(planned.job).toMatchObject({ phase: 'awaitingConfirmation', counts: expect.objectContaining({ excluded: 1, ready: 0 }) });

        const done = await drive(await dispatch.start(planned.job.id, OPERATOR));

        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 0 });
        expect(done.job.campaignId).toBeUndefined();
        expect(hablla.campaigns).toEqual([]);
    });

    it('creates a landline contact with the phone it was given and excludes it by that phone', async () => {
        const landline = '5133334444';
        const universe = anExclusionUniverse(0, []);
        const done = await dispatchToEnd(excluding(universe, [aRow('1', { phone: landline })]));

        expect(personWithPhone(`55${landline}`).map((person) => person.phones)).toEqual([[{ phone: `55${landline}`, is_whatsapp: true, type: 'personal' }]]);
        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 1 });

        hablla.segmentations.get(universe)!.items.push({ id: hablla.newId(), person: personWithPhone(`55${landline}`)[0]!.id });

        const repeated = await drive(await dispatch.plan({ ...excluding(universe, [aRow('1', { phone: landline })]), repeatOfJobId: done.job.id }));

        expect(repeated.job.counts).toMatchObject({ excluded: 1, ready: 0 });
    });
});

describe('WorkspaceDispatch resumption', () => {
    it('reaches the same end over many short executions as in one', async () => {
        const rows = Array.from({ length: 60 }, (_unused, index) => aRow(String(index + 1)));
        hablla.onRequest = () => {
            clock.current += 1_000;
        };

        const done = await dispatchToEnd(aRequest({ rows }));

        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 60, campaignQuantity: 60 });
        expect(hablla.persons.size).toBe(60);
        expect(hablla.requestsTo('POST', /\/persons$/)).toHaveLength(60);
        expect(hablla.requestsTo('POST', /segmentations-items$/)).toHaveLength(60);
        expect(hablla.campaigns).toHaveLength(1);
    });

    it('stops between rounds when the execution window runs out and picks the same block up again', async () => {
        const CALLS_PER_ROUND = 4;
        const ROUND_DURATION_MS = 20_000;
        const callsPerExecution: number[] = [];

        hablla.onRequest = () => {
            clock.current += ROUND_DURATION_MS;
        };

        let progress = await dispatch.plan(aRequest({ rows: [aRow('1'), aRow('2')] }));

        for (let continuation = 0; progress.next.kind === 'continueAfter'; continuation++) {
            expect(continuation).toBeLessThan(MAX_CONTINUATIONS);
            clock.current += progress.next.delayMs;

            const before = hablla.requests.length;

            progress = await dispatch.continue(progress.job.id, windowNow(CHUNK_TIME_RESERVE_MS + ROUND_DURATION_MS + 10_000));
            callsPerExecution.push(hablla.requests.length - before);

            if (progress.next.kind === 'awaitConfirmation') {
                progress = await dispatch.start(progress.job.id, OPERATOR);
            }
        }

        expect(Math.max(...callsPerExecution)).toBeLessThanOrEqual(CALLS_PER_ROUND);
        expect(progress.job).toMatchObject({ phase: 'completed', audienceSize: 2, campaignQuantity: 2 });
    });

    it('cools down after a 429 in the middle of the writes and never repeats a confirmed write', async () => {
        hablla.faults.push({ matches: (request) => request.method === 'POST' && request.path.endsWith('/persons') && request.body.phones[0].phone === phoneOf('2'), kind: 'throttle', times: 1 });

        const planned = await drive(await dispatch.plan(aRequest({ rows: [aRow('1'), aRow('2'), aRow('3')] })));
        const started = await dispatch.start(planned.job.id, OPERATOR);
        const throttled = await dispatch.continue(started.job.id, windowNow());

        expect(throttled.next).toEqual({ kind: 'continueAfter', delayMs: THROTTLE_COOLDOWN_MS });
        expect(store.contactsOf(throttled.job.id)[1]).toMatchObject({ createSends: 0, writesDone: 0 });
        expect(store.contactsOf(throttled.job.id)[1]!.pendingWrite).toBeUndefined();

        const done = await drive(throttled);

        expect(done.job.phase).toBe('completed');
        expect(hablla.requestsTo('POST', /\/persons$/)).toHaveLength(4);
        expect(hablla.persons.size).toBe(3);
    });

    it('reconciles a create whose execution died after the POST, without posting again', async () => {
        const planned = await drive(await dispatch.plan(aRequest({ rows: [aRow('1')] })));
        const started = await dispatch.start(planned.job.id, OPERATOR);

        hablla.onRequest = (request) => {
            if (request.method === 'POST' && request.path.endsWith('/persons')) {
                store.killedUpdates = 2;
            }
        };

        await expect(dispatch.continue(started.job.id, windowNow())).rejects.toThrow('execution killed');
        expect(store.contactsOf(started.job.id)[0]).toMatchObject({ pendingWrite: 'createPerson', createSends: 1 });

        hablla.onRequest = undefined;
        clock.current += EXECUTION_BUDGET_MS + LEASE_SLACK_MS + RECONCILIATION_DELAY_MS;

        const done = await drive(await dispatch.continue(started.job.id, windowNow()));

        expect(done.job.phase).toBe('completed');
        expect(hablla.requestsTo('POST', /\/persons$/)).toHaveLength(1);
        expect(hablla.requestsTo('GET', /\/v1\/workspaces\/[^/]+\/persons$/)).not.toHaveLength(0);
        expect(store.contactsOf(started.job.id)[0]).toMatchObject({ outcome: 'inAudience', person: { existed: false } });
    });

    it('reconciles a join whose execution died after the POST, without joining again', async () => {
        const planned = await drive(await dispatch.plan(aRequest({ rows: [aRow('1')] })));
        const started = await dispatch.start(planned.job.id, OPERATOR);

        hablla.onRequest = (request) => {
            if (request.method === 'POST' && request.path.endsWith('/segmentations-items')) {
                store.killedUpdates = 2;
            }
        };

        await expect(dispatch.continue(started.job.id, windowNow())).rejects.toThrow('execution killed');

        hablla.onRequest = undefined;
        clock.current += EXECUTION_BUDGET_MS + LEASE_SLACK_MS + RECONCILIATION_DELAY_MS;

        const done = await drive(await dispatch.continue(started.job.id, windowNow()));

        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 1, campaignQuantity: 1 });
        expect(hablla.requestsTo('POST', /segmentations-items$/)).toHaveLength(1);
    });

    it('re-sends a create whose response was lost and nothing was created only once, then fails the contact', async () => {
        hablla.faults.push({ matches: (request) => request.method === 'POST' && request.path.endsWith('/persons') && request.body.phones[0].phone === phoneOf('1'), kind: 'status', status: 502, times: 2 });

        const done = await dispatchToEnd(aRequest({ rows: [aRow('1'), aRow('2')] }));

        expect(done.job.phase).toBe('completed');
        expect(outcomesOf(done.job.id)).toEqual(['0:writeFailed', '1:inAudience']);
        expect(hablla.requestsTo('POST', /\/persons$/).filter((request) => request.body.phones[0].phone === phoneOf('1'))).toHaveLength(2);
        expect(personWithPhone(phoneOf('1'))).toHaveLength(0);
    });

    it('spends no attempt on an interrupted wave and cools down before retrying', async () => {
        hablla.faults.push({ matches: (request) => request.path.endsWith('/v2/workspaces/' + WORKSPACE_ID + '/persons'), kind: 'reject', times: 4 });

        const planned = await dispatch.plan(aRequest({ rows: [aRow('1'), aRow('2')] }));
        const interrupted = await dispatch.continue(planned.job.id, windowNow());

        expect(interrupted.next).toEqual({ kind: 'continueAfter', delayMs: TRANSPORT_COOLDOWN_MS });
        expect(store.contactsOf(planned.job.id).map((contact) => contact.attempts)).toEqual([0, 0]);

        const resolved = await drive(interrupted);

        expect(resolved.job.counts.ready).toBe(2);
    });

    it('gives up on a contact whose calls keep breaking the wave, instead of retrying it forever', async () => {
        dispatch = buildDispatch(1_000_000, 1);
        hablla.faults.push({ matches: (request) => request.query.get('phone') === phoneOf('1'), kind: 'reject', times: Number.POSITIVE_INFINITY });

        const done = await dispatchToEnd(aRequest({ rows: [aRow('1'), aRow('2')] }));

        expect(outcomesOf(done.job.id)).toEqual(['0:lookupFailed', '1:inAudience']);
        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 1 });
    });

    it('never retries a 5xx lookup in the same execution', async () => {
        hablla.faults.push({ matches: (request) => request.query.get('phone') === phoneOf('1'), kind: 'status', status: 500, times: 1 });

        const planned = await dispatch.plan(aRequest({ rows: [aRow('1'), aRow('2')] }));
        const first = await dispatch.continue(planned.job.id, windowNow());

        expect(hablla.requests.filter((request) => request.query.get('phone') === phoneOf('1'))).toHaveLength(1);
        expect(first.job.phase).toBe('resolving');
        expect(first.next.kind === 'continueAfter' && first.next.delayMs).toBe(CALL_RETRY_DELAY_MS);
        expect(store.contactsOf(planned.job.id)[0]).toMatchObject({ attempts: 1, retryNotBefore: START + CALL_RETRY_DELAY_MS });

        expect((await drive(first)).job.counts.ready).toBe(2);
    });
});

describe('WorkspaceDispatch revalidation and audience', () => {
    it('re-resolves each contact right before its writes', async () => {
        hablla.addPerson({ id: habllaId('c'), phone: phoneOf('3'), users: [SYSTEM_USER.id] });
        hablla.addPerson({ id: habllaId('a'), phone: phoneOf('1'), users: [ADVISOR.id] });

        const planned = await drive(await dispatch.plan(aRequest({ rows: [aRow('1'), aRow('2'), aRow('3')] })));

        hablla.services.push({ id: 'opened', status: 'pending', key: `${CONNECTION_ID}_${phoneOf('1')}` });
        hablla.addPerson({ id: habllaId('b'), phone: phoneOf('2'), users: [] });
        hablla.persons.get(habllaId('c'))!.users = [OTHER_ADVISOR.id];

        const done = await drive(await dispatch.start(planned.job.id, OPERATOR));

        expect(outcomesOf(done.job.id)).toEqual(['0:inAttendance', '1:inAudience', '2:inAudience']);
        expect(done.job.revalidationShifts).toEqual({ inAttendance: 1 });
        expect(hablla.requestsTo('POST', /\/persons$/)).toHaveLength(0);
        expect(hablla.persons.get(habllaId('b'))!.users).toEqual([ADVISOR.id]);
        expect(hablla.persons.get(habllaId('c'))!.users).toEqual([OTHER_ADVISOR.id]);
        expect(store.contactsOf(done.job.id)[2]!.ownerChange).toEqual({ kind: 'keep' });
    });

    it('reaches a person listed on two rows through one contact only', async () => {
        hablla.addPerson({ id: habllaId('p'), phone: phoneOf('1'), phones: [{ phone: phoneOf('1'), is_whatsapp: true, type: 'personal' }, { phone: phoneOf('2'), is_whatsapp: true, type: 'personal' }] });

        const done = await dispatchToEnd(aRequest({ rows: [aRow('1'), aRow('2')] }));

        expect(outcomesOf(done.job.id)).toEqual(['0:inAudience', '1:repeatedPerson']);
        expect(hablla.requestsTo('POST', /segmentations-items$/)).toHaveLength(1);
        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 1, campaignQuantity: 1 });
    });

    it('leaves a person without a WhatsApp phone out before any write, instead of blocking the audience', async () => {
        hablla.addPerson({ id: habllaId('p'), phone: phoneOf('1'), whatsapp: false });

        const done = await dispatchToEnd(aRequest({ rows: [aRow('1'), aRow('2')] }));

        expect(outcomesOf(done.job.id)).toEqual(['0:noWhatsapp', '1:inAudience']);
        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 1, campaignQuantity: 1 });
        expect(hablla.persons.get(habllaId('p'))!.custom_fields).toEqual([]);
        expect(hablla.campaigns).toHaveLength(1);
    });

    it('sends a person whose phone does not declare WhatsApp, without breaking the execution', async () => {
        hablla.addPerson({ id: habllaId('p'), phone: phoneOf('1'), phones: [{ phone: phoneOf('1'), type: 'personal' }] });

        const done = await dispatchToEnd(aRequest({ rows: [aRow('1'), aRow('2')] }));

        expect(outcomesOf(done.job.id)).toEqual(['0:inAudience', '1:inAudience']);
        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 2, campaignQuantity: 2 });
    });

    it('completes without a campaign when no contact is left to send', async () => {
        hablla.addPerson({ id: habllaId('p'), phone: phoneOf('1'), whatsapp: false });

        const done = await dispatchToEnd(aRequest({ rows: [aRow('1')] }));

        expect(outcomesOf(done.job.id)).toEqual(['0:noWhatsapp']);
        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 0 });
        expect(done.job.campaignId).toBeUndefined();
        expect(hablla.campaigns).toHaveLength(0);
    });

    it('fails an audience that never propagates, and completes once resumed after it does', async () => {
        hablla.notPropagatedCounts = Number.POSITIVE_INFINITY;

        const failed = await dispatchToEnd(aRequest({ rows: [aRow('1')] }));

        expect(failed.job).toMatchObject({ phase: 'failed', failure: { reason: 'audience_timeout', detail: 'audience not ready: last count never resolved, expected 1' } });
        expect(hablla.campaigns).toHaveLength(0);

        hablla.notPropagatedCounts = 0;
        clock.current += AUDIENCE_READY_TIMEOUT_MS;

        const done = await drive(await dispatch.start(failed.job.id, OPERATOR));

        expect(done.job).toMatchObject({ phase: 'completed', campaignQuantity: 1 });
    });

    it('keeps waiting when the count answers a gateway error, then times out without a campaign', async () => {
        hablla.faults.push({ matches: (request) => request.path.endsWith('/count'), kind: 'status', status: 502, times: Number.POSITIVE_INFINITY });

        const failed = await dispatchToEnd(aRequest({ rows: [aRow('1')] }));

        expect(failed.job).toMatchObject({ phase: 'failed', failure: { reason: 'audience_timeout', detail: 'audience not ready: last count never resolved, expected 1' } });
        expect(hablla.campaigns).toHaveLength(0);
    });

    it('fails the job when the count is refused for good, without a campaign and without an exception', async () => {
        hablla.notPropagatedCounts = 0;
        hablla.faults.push({ matches: (request) => request.path.endsWith('/count'), kind: 'status', status: 400, times: Number.POSITIVE_INFINITY });

        const failed = await dispatchToEnd(aRequest({ rows: [aRow('1')] }));

        expect(failed.job).toMatchObject({ phase: 'failed', failure: { reason: 'audience_query_rejected', resumePhase: 'awaitingAudience' } });
        expect(failed.job.failure!.detail).toContain('400');
        expect(failed.next).toEqual({ kind: 'finished' });
        expect(hablla.campaigns).toHaveLength(0);
        expect(hablla.requestsTo('POST', /\/count$/)).toHaveLength(1);
    });

    it('fails on a larger audience than expected without a campaign, and can be abandoned', async () => {
        const stranger = hablla.addPerson({ phone: phoneOf('9') });
        hablla.onRequest = (request) => {
            const itemsPost = request.method === 'POST' && request.path.endsWith('/segmentations-items');
            if (itemsPost) {
                const segmentationId = request.path.split('/')[5]!;
                hablla.segmentations.get(segmentationId)!.items.push({ id: 'intruder', person: stranger.id });
                hablla.onRequest = undefined;
            }
        };

        const failed = await dispatchToEnd(aRequest({ rows: [aRow('1')] }));

        expect(failed.job).toMatchObject({ phase: 'failed', failure: { reason: 'audience_mismatch' } });
        expect(hablla.campaigns).toHaveLength(0);
        expect((await dispatch.abandon(failed.job.id, OPERATOR)).job).toMatchObject({ phase: 'abandoned', abandonedBy: OPERATOR.operatorEmail });
    });
});

describe('WorkspaceDispatch campaign', () => {
    it('reconciles a campaign created behind a 5xx without posting it again', async () => {
        hablla.faults.push({ matches: (request) => request.method === 'POST' && request.path.endsWith('/campaigns'), kind: 'applyThenStatus', status: 502, times: 1 });

        const done = await dispatchToEnd(aRequest({ rows: [aRow('1')] }));

        expect(done.job).toMatchObject({ phase: 'completed', campaignId: hablla.campaigns[0]!.id });
        expect(done.job.campaignSendState).toBeUndefined();
        expect(hablla.requestsTo('POST', /\/campaigns$/)).toHaveLength(1);
        expect(hablla.requestsTo('GET', /\/campaigns$/)).toHaveLength(1);
    });

    it('fails as not created when the reconciliation finds nothing, and re-sends on start', async () => {
        hablla.faults.push({ matches: (request) => request.method === 'POST' && request.path.endsWith('/campaigns'), kind: 'status', status: 502, times: 1 });

        const failed = await dispatchToEnd(aRequest({ rows: [aRow('1')] }));

        expect(failed.job).toMatchObject({ phase: 'failed', failure: { reason: 'campaign_rejected', detail: 'not created', resumePhase: 'sending' } });
        expect(failed.job.campaignSendState).toBeUndefined();

        const done = await drive(await dispatch.start(failed.job.id, OPERATOR));

        expect(done.job.phase).toBe('completed');
        expect(hablla.requestsTo('POST', /\/campaigns$/)).toHaveLength(2);
        expect(hablla.campaigns).toHaveLength(1);
    });

    it('refuses to abandon a job whose campaign may have been created, and to plan its audience again', async () => {
        hablla.faults.push({ matches: (request) => request.method === 'POST' && request.path.endsWith('/campaigns'), kind: 'status', status: 502, times: 1 });
        hablla.faults.push({ matches: (request) => request.method === 'GET' && request.path.endsWith('/campaigns'), kind: 'status', status: 500, times: 3 });

        const request = aRequest({ rows: [aRow('1')] });
        const failed = await dispatchToEnd(request);

        expect(failed.job).toMatchObject({ phase: 'failed', campaignSendState: 'inFlight', failure: { reason: 'campaign_outcome_unknown' } });
        await expect(dispatch.abandon(failed.job.id, OPERATOR)).rejects.toBeInstanceOf(InvalidJobTransitionError);
        await expect(dispatch.plan(request)).rejects.toBeInstanceOf(DuplicateDispatchError);
    });

    it('clears the campaign marker when the Bearer authorization fails before the POST', async () => {
        hablla.notPropagatedCounts = 0;
        hablla.onRequest = (request) => {
            if (request.path.endsWith('/count')) {
                bearerAuthorizationFailure = new Error('firebase down');
            }
        };

        const planned = await drive(await dispatch.plan(aRequest({ rows: [aRow('1')] })));
        const started = await dispatch.start(planned.job.id, OPERATOR);

        await expect(drive(started)).rejects.toThrow('firebase down');

        const stored = await store.load(started.job.id);

        expect(stored.phase).toBe('sending');
        expect(stored.campaignSendState).toBeUndefined();
        expect(stored.leaseUntil).toBeUndefined();
        expect(hablla.requestsTo('POST', /\/campaigns$/)).toHaveLength(0);

        hablla.onRequest = undefined;
        bearerAuthorizationFailure = undefined;

        const done = await drive(await dispatch.continue(started.job.id, windowNow()));

        expect(done.job.phase).toBe('completed');
        expect(hablla.campaigns).toHaveLength(1);
    });

    it('takes the campaign quantity from a later read, never from the creation response', async () => {
        const done = await dispatchToEnd(aRequest({ rows: [aRow('1')] }));
        const created = hablla.requestsTo('POST', /\/campaigns$/);
        const read = hablla.requestsTo('GET', /\/campaigns$/);

        expect(done.job).toMatchObject({ phase: 'completed', audienceSize: 1, campaignQuantity: 1, warnings: [] });
        expect(done.job.campaignSendState).toBeUndefined();
        expect(created).toHaveLength(1);
        expect(read).toHaveLength(1);
        expect(read[0]!.query.get('name')).toBe(created[0]!.body.name);
    });

    it('completes with a warning when the campaign read reports more than the audience', async () => {
        hablla.campaignQuantityOverride = 7;

        const done = await dispatchToEnd(aRequest({ rows: [aRow('1')] }));

        expect(done.job).toMatchObject({ phase: 'completed', warnings: [{ kind: 'campaignQuantityMismatch', campaignQuantity: 7, audienceSize: 1 }] });
    });

    it('completes a created campaign as unverified when its quantity can never be read', async () => {
        hablla.faults.push({ matches: (request) => request.method === 'GET' && request.path.endsWith('/campaigns'), kind: 'status', status: 500, times: Number.POSITIVE_INFINITY });

        const done = await dispatchToEnd(aRequest({ rows: [aRow('1')] }));

        expect(done.job).toMatchObject({ phase: 'completed', campaignId: hablla.campaigns[0]!.id, warnings: [{ kind: 'campaignQuantityUnverified', audienceSize: 1 }] });
        expect(done.job.campaignQuantity).toBeUndefined();
        expect(hablla.requestsTo('POST', /\/campaigns$/)).toHaveLength(1);
    });
});

describe('WorkspaceDispatch duplicates and concurrency', () => {
    it('supersedes an unstarted plan, refuses after a start, and allows a confirmed repeat or an abandoned job', async () => {
        const request = aRequest({ rows: [aRow('1')] });
        const first = await drive(await dispatch.plan(request));
        clock.current += 1;
        const second = await drive(await dispatch.plan(request));

        expect((await store.load(first.job.id)).phase).toBe('superseded');

        await dispatch.start(second.job.id, OPERATOR);
        clock.current += 1;
        await expect(dispatch.plan(request)).rejects.toBeInstanceOf(DuplicateDispatchError);

        const done = await drive(await dispatch.continue(second.job.id, windowNow()));
        expect(done.job.phase).toBe('completed');
        await expect(dispatch.plan(request)).rejects.toBeInstanceOf(DuplicateDispatchError);

        clock.current += 1;
        const repeat = await dispatch.plan({ ...request, repeatOfJobId: done.job.id });
        expect(repeat.job.phase).toBe('resolving');

        await dispatch.abandon(repeat.job.id, OPERATOR);
        clock.current += 1;
        await expect(dispatch.plan({ ...request, repeatOfJobId: done.job.id })).resolves.toMatchObject({ job: { phase: 'resolving' } });
    });

    it('allows a chain of confirmed repeats, each confirming the latest send', async () => {
        const request = aRequest({ rows: [aRow('1')] });
        const first = await dispatchToEnd(request);
        clock.current += 1;
        const second = await dispatchToEnd({ ...request, repeatOfJobId: first.job.id });
        clock.current += 1;

        await expect(dispatch.plan({ ...request, repeatOfJobId: first.job.id })).rejects.toBeInstanceOf(DuplicateDispatchError);

        const third = await dispatchToEnd({ ...request, repeatOfJobId: second.job.id });

        expect([first, second, third].map((progress) => progress.job.phase)).toEqual(['completed', 'completed', 'completed']);
        expect(hablla.campaigns).toHaveLength(3);
    });

    it('allows a repeat confirmed from the latest dispatch even when that one sent no campaign', async () => {
        const request = aRequest({ rows: [aRow('1')] });
        const sent = await dispatchToEnd(request);
        clock.current += 1;

        hablla.persons.get(personWithPhone(phoneOf('1'))[0]!.id)!.phones = [{ phone: phoneOf('1'), is_whatsapp: false, type: 'personal' }];

        const unsent = await dispatchToEnd({ ...request, repeatOfJobId: sent.job.id });

        expect(unsent.job).toMatchObject({ phase: 'completed', audienceSize: 0 });
        expect(unsent.job.campaignId).toBeUndefined();

        clock.current += 1;
        const repeat = await dispatch.plan({ ...request, repeatOfJobId: unsent.job.id });

        expect(repeat.job.phase).toBe('resolving');
        expect(hablla.campaigns).toHaveLength(1);
    });

    it('is busy while a continuation holds the lease of an unstarted job with the same audience', async () => {
        const request = aRequest({ rows: [aRow('1')] });
        const planned = await dispatch.plan(request);
        store.overwrite(planned.job.id, { leaseUntil: clock.now() + 10_000 });
        clock.current += 1;

        await expect(dispatch.plan(request)).rejects.toBeInstanceOf(JobBusyError);
        expect((await store.load(planned.job.id)).phase).toBe('resolving');
        await expect(dispatch.continue(planned.job.id, windowNow())).rejects.toBeInstanceOf(JobBusyError);
    });

    it('stops without writing when another execution moved the job on', async () => {
        const planned = await dispatch.plan(aRequest({ rows: [aRow('1')] }));
        hablla.onRequest = () => {
            store.overwrite(planned.job.id, { phase: 'superseded', leaseUntil: undefined });
            hablla.onRequest = undefined;
        };

        const late = await dispatch.continue(planned.job.id, windowNow());

        expect(late.job.phase).toBe('superseded');
        expect(late.next).toEqual({ kind: 'finished' });
        expect((await store.load(planned.job.id)).phase).toBe('superseded');
        expect(store.contactsOf(planned.job.id)[0]!.outcome).toBe('pendingLookup');
    });

    it('refuses to start a superseded job or a job whose audience is already active elsewhere', async () => {
        const request = aRequest({ rows: [aRow('1')] });
        const first = await drive(await dispatch.plan(request));
        clock.current += 1;
        const second = await drive(await dispatch.plan(request));

        await expect(dispatch.start(first.job.id, OPERATOR)).rejects.toBeInstanceOf(InvalidJobTransitionError);

        const entry = store.jobs.get(second.job.id)!;
        store.jobs.set('other-active', { job: { ...entry.job, id: 'other-active', phase: 'materializing' }, contacts: entry.contacts });

        await expect(dispatch.start(second.job.id, OPERATOR)).rejects.toBeInstanceOf(DuplicateDispatchError);
        expect((await store.load(second.job.id)).phase).toBe('awaitingConfirmation');
    });
});

describe('WorkspaceDispatch token rejection', () => {
    it('fails on a revoked workspace token and resumes in the same phase', async () => {
        const planned = await dispatch.plan(aRequest({ rows: [aRow('1')] }));
        hablla.workspaceTokenRevoked = true;

        const failed = await drive(planned);

        expect(failed.job).toMatchObject({ phase: 'failed', failure: { reason: 'workspace_token_rejected', resumePhase: 'resolving' } });

        hablla.workspaceTokenRevoked = false;

        expect((await drive(await dispatch.start(failed.job.id, OPERATOR))).next).toEqual({ kind: 'awaitConfirmation' });
    });

    it('fails on a revoked Bearer token while counting the audience', async () => {
        hablla.onRequest = (request) => {
            if (request.path.endsWith('/count')) {
                hablla.bearerTokenRevoked = true;
            }
        };

        const failed = await dispatchToEnd(aRequest({ rows: [aRow('1')] }));

        expect(failed.job).toMatchObject({ phase: 'failed', failure: { reason: 'bearer_token_rejected', resumePhase: 'awaitingAudience' } });
    });
});

describe('WorkspaceDispatch fails fast', () => {
    it('refuses a missing first-name field after reading only the catalogs', async () => {
        await expect(dispatch.plan(aRequest({ firstNameFieldId: habllaId('f00d') }))).rejects.toBeInstanceOf(DispatchValidationError);
        expect(hablla.requests.every((request) => request.method === 'GET')).toBe(true);
        expect(store.jobs.size).toBe(0);
    });

    it('refuses a first-name field of the wrong type', async () => {
        hablla.customFields = [{ id: FIRST_NAME_FIELD_ID, target: 'person', type: 'number', name: 'Primeiro Nome' }];

        await expect(dispatch.plan(aRequest())).rejects.toThrow(/type string/);
    });

    it('refuses an empty filter type before any call', async () => {
        await expect(dispatch.plan(aRequest({ exclusion: { phones: [], segmentationFilters: [{ type: '' }] } }))).rejects.toBeInstanceOf(DispatchValidationError);
        expect(hablla.requests).toHaveLength(0);
    });

    it('refuses a dispatch above the daily call quota without storing a job', async () => {
        dispatch = buildDispatch(10);

        await expect(dispatch.plan(aRequest({ rows: [aRow('1')] }))).rejects.toBeInstanceOf(CallBudgetExceededError);
        expect(store.jobs.size).toBe(0);
    });

    it('tells a throttled catalog read apart from one lost to the network', async () => {
        hablla.faults.push({ matches: (request) => request.path.endsWith('/users'), kind: 'throttle', times: 1 });

        await expect(dispatch.plan(aRequest())).rejects.toBeInstanceOf(DispatchThrottledError);

        hablla.faults.push({ matches: (request) => request.path.endsWith('/users'), kind: 'reject', times: 1 });

        await expect(dispatch.plan(aRequest())).rejects.toBeInstanceOf(DispatchTransportError);
        expect(store.jobs.size).toBe(0);
    });

    it('refuses a lease that does not outlive the deadline', async () => {
        const planned = await dispatch.plan(aRequest());

        await expect(dispatch.continue(planned.job.id, { deadlineAt: clock.now() + CHUNK_TIME_RESERVE_MS, leaseUntil: clock.now() })).rejects.toBeInstanceOf(RangeError);
    });
});

describe('WorkspaceDispatch status', () => {
    it('reads a page of contacts without any call', async () => {
        const planned = await dispatch.plan(aRequest({ rows: [aRow('1'), aRow('2'), aRow('3')] }));
        const before = hablla.requests.length;
        const view = await dispatch.status(planned.job.id, { offset: 1, limit: 2 });

        expect(view.contacts.map((contact) => contact.index)).toEqual([1, 2]);
        expect(view.next).toEqual({ kind: 'continueAfter', delayMs: 0 });
        expect(hablla.requests).toHaveLength(before);
        expect(await dispatch.resumableJobIds()).toEqual([planned.job.id]);
    });
});
