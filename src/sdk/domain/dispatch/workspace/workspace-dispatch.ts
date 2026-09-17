import type { CallExecutor, CallResult, HttpCall } from '../../../core/call-executor';
import type { AuthStrategy } from '../../../core/strategy';
import type { StopCause } from './call-failures';
import type { CatalogPages } from './call-budget';
import type { BlockContact, ContactStep } from './contact-step';
import type { EarlyStop } from './job-machine';
import type { Clock, DispatchJobStore } from './ports';
import type {
    ChunkedPhase,
    ContactOutcome,
    ContactPage,
    ContinueOptions,
    DispatchContact,
    DispatchJob,
    DispatchJobView,
    DispatchProgress,
    OperatorOptions,
    WorkspaceDispatchLimits,
    WorkspaceDispatchRequest,
} from './types';
import { prepareAudience } from './audience';
import { estimateCallBudget } from './call-budget';
import { isSuccess, payloadOf, truncateDetail } from './call-failures';
import { buildAudienceQuery, buildCampaignBody, buildSegmentationBody, dispatchName } from './campaign';
import { CHUNK_TIME_RESERVE_MS, AUDIENCE_POLL_INTERVAL_MS, LOOKUP_CHUNK_SIZE, WRITE_CHUNK_SIZE } from './constants';
import { applyContactStep, nextContactStep, writeAheadOf } from './contact-step';
import { CallBudgetExceededError, DispatchThrottledError, DispatchValidationError, DuplicateDispatchError, InvalidJobTransitionError, JobBusyError, StaleJobError } from './errors';
import {
    RESUMABLE_PHASES,
    advanceCursor,
    createJob,
    duplicateVerdict,
    hasPhaseWork,
    isLeased,
    nextStepOf,
    tallyOutcomes,
    toAbandoned,
    toAwaitingAudience,
    toAwaitingConfirmation,
    toCompleted,
    toFailed,
    toMaterializing,
    toResumed,
    toSuperseded,
    trackInterruptedRounds,
} from './job-machine';
import { toCreatedId, toCustomFieldDefinition, toPayloadPage, toRosterUser } from './payloads';
import { assertValidRequest, assertValidRequestShape, indexCustomFields, indexRoster } from './request-validation';
import { countAudience, createCampaign, createSegmentation, findCampaignsByName, listCustomFieldsPage, listUsersPage } from './routes';
import { isCampaignReconcileDue, resolveAudienceCount, resolveCampaignCreation, resolveCampaignReconciliation, withCampaignInFlight, withoutCampaignInFlight, type SendPhaseResolution } from './send-phases';

/** The effects a dispatch runs through; composed by the runtime. */
export interface WorkspaceDispatchPorts {
    executor: CallExecutor;
    store: DispatchJobStore;
    clock: Clock;
}

/** The job being worked on by one `continue`, with the person claims loaded for it. */
interface ContinueSession {
    job: DispatchJob;
    claims?: ReadonlyMap<string, number>;
}

/** How one step of the `continue` loop ended: keep looping, yield until the next step's delay, or stop early. */
type LoopSignal = { kind: 'next' } | { kind: 'yield' } | { kind: 'stop'; stop: EarlyStop };

/** A catalog read by pages. */
interface CatalogRead<T> {
    items: T[];
    pages: number;
}

/**
 * Flow-less dispatch through a native campaign, with every O(N) call on the workspace
 * token and Bearer spent O(1) per dispatch. The dispatch is a resumable job in chunks:
 * `plan` validates and queues it, `continue` works on it inside an absolute execution
 * window and a lease, `start` confirms it (or resumes a failure), `abandon` ends it and
 * `status` reads it. All decisions live in pure modules; this class only sequences calls
 * through the {@link CallExecutor} and persists through the {@link DispatchJobStore}.
 */
export class WorkspaceDispatch {
    constructor(private readonly ports: WorkspaceDispatchPorts, private readonly limits: WorkspaceDispatchLimits) {
        if (!Number.isInteger(limits.dailyCallQuota) || limits.dailyCallQuota < 1) {
            throw new RangeError(`WorkspaceDispatch: dailyCallQuota must be an integer >= 1, got ${limits.dailyCallQuota}`);
        }
    }

    /**
     * Validates the request against the roster and the custom fields, prepares the
     * audience, checks the call budget and the duplicate verdict, and inserts the job.
     *
     * @throws DispatchValidationError, DispatchThrottledError, CallBudgetExceededError,
     *   DuplicateDispatchError or JobBusyError, always before any write.
     */
    async plan(request: WorkspaceDispatchRequest): Promise<DispatchProgress> {
        assertValidRequestShape(request);

        const roster = await this.readCatalog(listUsersPage, toRosterUser, 'users');
        const customFields = await this.readCatalog(listCustomFieldsPage, toCustomFieldDefinition, 'custom fields');
        const rosterIndex = indexRoster(roster.items);

        assertValidRequest(request, rosterIndex, indexCustomFields(customFields.items));

        const prepared = prepareAudience(request, rosterIndex);
        const catalogPages: CatalogPages = { roster: roster.pages, customFields: customFields.pages };
        const budget = estimateCallBudget(prepared.contacts, catalogPages);

        if (budget.total > this.limits.dailyCallQuota) {
            throw new CallBudgetExceededError(budget, this.limits.dailyCallQuota);
        }

        const job = createJob(prepared, request, this.ports.clock.now());
        const inserted = await this.ports.store.withExclusiveAccess(() => this.insertUnlessDuplicate(job, prepared.contacts, request.repeatOfJobId));

        return this.progressOf(inserted);
    }

    /**
     * Confirms a job awaiting confirmation (creating its segmentation) or resumes a failed
     * job at its resume phase.
     *
     * @throws JobBusyError, DuplicateDispatchError or InvalidJobTransitionError.
     */
    async start(jobId: string, options: OperatorOptions): Promise<DispatchProgress> {
        const started = await this.ports.store.withExclusiveAccess(async () => {
            const job = await this.loadIdle(jobId);
            const now = this.ports.clock.now();

            if (job.phase === 'failed') {
                return this.ports.store.update(toResumed(job, now), []);
            }

            if (job.phase !== 'awaitingConfirmation') {
                throw new InvalidJobTransitionError(job.id, job.phase, 'start');
            }

            await this.assertNoOtherActiveJob(job, now);

            if (job.counts.ready === 0) {
                return this.ports.store.update(toCompleted(job, now), []);
            }

            const segmentationId = await this.createSegmentation(job);

            return this.ports.store.update(toMaterializing(job, segmentationId, options.operatorEmail, this.ports.clock.now()), []);
        });

        return this.progressOf(started);
    }

    /**
     * Works on a resumable job inside the execution window: takes the lease, runs chunks
     * and the Bearer phases while time is left, and releases the lease. A lost
     * compare-and-set means another execution owns the job: it stops without writing and
     * reports the stored state.
     *
     * @throws RangeError when the lease does not outlive the deadline; JobBusyError when
     *   another execution holds the lease.
     */
    async continue(jobId: string, options: ContinueOptions): Promise<DispatchProgress> {
        if (!(options.leaseUntil > options.deadlineAt)) {
            throw new RangeError(`WorkspaceDispatch.continue: leaseUntil (${options.leaseUntil}) must be later than deadlineAt (${options.deadlineAt})`);
        }

        const leased = await this.acquireLease(jobId, options.leaseUntil);

        if (!RESUMABLE_PHASES.includes(leased.phase)) {
            return this.progressOf(leased);
        }

        const session: ContinueSession = { job: leased };

        try {
            const stop = await this.runUntilDeadline(session, options.deadlineAt);
            const released = await this.ports.store.update({ ...session.job, leaseUntil: undefined }, []);

            return { job: released, next: nextStepOf(released, stop, this.ports.clock.now()) };
        } catch (error) {
            if (error instanceof StaleJobError) {
                return this.progressOf(await this.ports.store.load(jobId));
            }

            await this.releaseLeaseAfterFailure(session.job);
            throw error;
        }
    }

    /**
     * Ends a job that is not over; nothing written is undone.
     *
     * @throws JobBusyError or InvalidJobTransitionError.
     */
    async abandon(jobId: string, options: OperatorOptions): Promise<DispatchProgress> {
        const abandoned = await this.ports.store.withExclusiveAccess(async () => {
            const job = await this.loadIdle(jobId);
            return this.ports.store.update(toAbandoned(job, options.operatorEmail, this.ports.clock.now()), []);
        });

        return this.progressOf(abandoned);
    }

    /** The job and a page of its contacts, read from the store only. */
    async status(jobId: string, page: ContactPage): Promise<DispatchJobView> {
        const job = await this.ports.store.load(jobId);
        const contacts = await this.ports.store.loadContacts(jobId, page);

        return { ...this.progressOf(job), contacts };
    }

    /** Ids of the jobs a continuation should work on. */
    async resumableJobIds(): Promise<string[]> {
        return (await this.ports.store.findByPhases(RESUMABLE_PHASES)).map((job) => job.id);
    }

    /** The job with the next step computed now. */
    private progressOf(job: DispatchJob): DispatchProgress {
        return { job, next: nextStepOf(job, undefined, this.ports.clock.now()) };
    }

    /**
     * Reads every page of a catalog; any non-2xx fails the plan before a write.
     *
     * @throws DispatchThrottledError or DispatchValidationError.
     */
    private async readCatalog<T>(pageCall: (page: number) => HttpCall, parse: (raw: unknown) => T, catalog: string): Promise<CatalogRead<T>> {
        const [first] = await this.ports.executor.executeAll([pageCall(1)]);
        const firstPage = toPayloadPage(requireSuccess(first!, catalog), catalog);
        const laterCalls = Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_unused, offset) => pageCall(offset + 2));
        const laterResults = laterCalls.length > 0 ? await this.ports.executor.executeAll(laterCalls) : [];
        const laterItems = laterResults.flatMap((result) => toPayloadPage(requireSuccess(result, catalog), catalog).results);

        return { items: [...firstPage.results, ...laterItems].map(parse), pages: 1 + laterCalls.length };
    }

    /** Inserts the job unless a duplicate blocks it, superseding idle jobs of the same audience. */
    private async insertUnlessDuplicate(job: DispatchJob, contacts: readonly DispatchContact[], repeatOfJobId: string | undefined): Promise<DispatchJob> {
        const verdict = duplicateVerdict(await this.ports.store.findByFingerprint(job.fingerprint), repeatOfJobId, job.createdAt);

        if (verdict.kind === 'refuse') {
            throw new DuplicateDispatchError(verdict.job.id, verdict.job.phase, verdict.job.failure?.resumePhase);
        }

        if (verdict.kind === 'busy') {
            throw new JobBusyError(verdict.job.id);
        }

        for (const idle of verdict.supersede) {
            await this.supersede(idle, job.createdAt);
        }

        return this.ports.store.insert(job, contacts);
    }

    /** Supersedes an idle job; losing the compare-and-set means it just got busy. */
    private async supersede(job: DispatchJob, now: number): Promise<void> {
        try {
            await this.ports.store.update(toSuperseded(job, now), []);
        } catch (error) {
            if (error instanceof StaleJobError) {
                throw new JobBusyError(job.id);
            }
            throw error;
        }
    }

    /** Loads a job that no execution holds. */
    private async loadIdle(jobId: string): Promise<DispatchJob> {
        const job = await this.ports.store.load(jobId);

        if (isLeased(job, this.ports.clock.now())) {
            throw new JobBusyError(job.id);
        }

        return job;
    }

    /** Refuses to start while another job of the same audience is active or was sent. */
    private async assertNoOtherActiveJob(job: DispatchJob, now: number): Promise<void> {
        const others = (await this.ports.store.findByFingerprint(job.fingerprint)).filter((other) => other.id !== job.id);
        const verdict = duplicateVerdict(others, job.settings.repeatOfJobId, now);
        const blocking = verdict.kind === 'create' ? verdict.supersede[0] : verdict.job;

        if (blocking) {
            throw new DuplicateDispatchError(blocking.id, blocking.phase, blocking.failure?.resumePhase);
        }
    }

    /** Creates the job's segmentation on Bearer; a non-2xx leaves the job awaiting confirmation. */
    private async createSegmentation(job: DispatchJob): Promise<string> {
        const [result] = await this.ports.executor.executeAll([createSegmentation(buildSegmentationBody(job))]);

        return toCreatedId(requireSuccess(result!, 'segmentation creation'), 'segmentation');
    }

    /** Takes the lease of a resumable job; other phases are returned untouched. */
    private async acquireLease(jobId: string, leaseUntil: number): Promise<DispatchJob> {
        return this.ports.store.withExclusiveAccess(async () => {
            const job = await this.loadIdle(jobId);

            if (!RESUMABLE_PHASES.includes(job.phase)) {
                return job;
            }

            return this.ports.store.update({ ...job, leaseUntil }, []);
        });
    }

    /** Releases the lease after an unexpected error, unless another execution already owns the job. */
    private async releaseLeaseAfterFailure(job: DispatchJob): Promise<void> {
        try {
            await this.ports.store.update({ ...job, leaseUntil: undefined }, []);
        } catch (releaseError) {
            if (!(releaseError instanceof StaleJobError)) {
                throw releaseError;
            }
        }
    }

    /** Runs the job's phases while a chunk still fits before the deadline. */
    private async runUntilDeadline(session: ContinueSession, deadlineAt: number): Promise<EarlyStop | undefined> {
        while (RESUMABLE_PHASES.includes(session.job.phase) && this.hasTimeLeft(deadlineAt)) {
            const signal = await this.runPhaseStep(session, deadlineAt);

            if (signal.kind === 'stop') {
                return signal.stop;
            }

            if (signal.kind === 'yield') {
                return undefined;
            }
        }

        return undefined;
    }

    /** One step of the current phase. */
    private async runPhaseStep(session: ContinueSession, deadlineAt: number): Promise<LoopSignal> {
        switch (session.job.phase) {
            case 'resolving':
            case 'materializing':
                return this.runChunk(session, session.job.phase, deadlineAt);
            case 'awaitingAudience':
                return this.waitForAudience(session, deadlineAt);
            case 'sending':
                return this.sendCampaign(session);
            default:
                return { kind: 'yield' };
        }
    }

    /**
     * Processes one chunk of contacts from the cursor in rounds until every contact is
     * settled or deferred, then advances the cursor and closes the phase when no work is
     * left. A round only starts while the execution window has room for it; the cursor
     * stays put, so the next execution picks the same block up (every round persists what
     * it learned).
     */
    private async runChunk(session: ContinueSession, phase: ChunkedPhase, deadlineAt: number): Promise<LoopSignal> {
        const store = this.ports.store;
        const chunkSize = phase === 'resolving' ? LOOKUP_CHUNK_SIZE : WRITE_CHUNK_SIZE;
        const contacts = await store.loadContacts(session.job.id, { offset: session.job.cursor, limit: chunkSize });
        let blocks: BlockContact[] = contacts.map((contact) => ({ contact }));

        session.claims ??= await store.loadPersonClaims(session.job.id);

        for (;;) {
            const now = this.ports.clock.now();
            const steps = blocks.map((block) => nextContactStep(block, session.job, now));

            if (!steps.some((step) => step.kind === 'calls')) {
                break;
            }

            if (!this.hasTimeLeft(deadlineAt)) {
                return { kind: 'yield' };
            }

            blocks = await this.persistWriteAheads(session, blocks, steps);

            const round = await this.runRound(session, phase, blocks, steps);

            blocks = round.blocks;

            if (round.signal) {
                return round.signal;
            }
        }

        return this.closeChunk(session, phase, blocks.map((block) => block.contact));
    }

    /** Persists the write-ahead markers of a round before its calls are sent. */
    private async persistWriteAheads(session: ContinueSession, blocks: BlockContact[], steps: readonly ContactStep[]): Promise<BlockContact[]> {
        const marked = blocks.map((block, position) => {
            const writeAhead = writeAheadOf(block, steps[position]!);
            return writeAhead ? { ...block, contact: writeAhead } : block;
        });
        const changed = marked.filter((block, position) => block !== blocks[position]).map((block) => block.contact);

        if (changed.length > 0) {
            session.job = await this.ports.store.update({ ...session.job, updatedAt: this.ports.clock.now() }, changed);
        }

        return marked;
    }

    /** Sends every call of a round at once and applies each contact's results. */
    private async runRound(session: ContinueSession, phase: ChunkedPhase, blocks: readonly BlockContact[], steps: readonly ContactStep[]): Promise<{ blocks: BlockContact[]; signal?: LoopSignal }> {
        const calls = steps.flatMap((step) => (step.kind === 'calls' ? step.calls : []));
        const results = await this.executeRound(session, calls);
        const now = this.ports.clock.now();
        const shifts: Partial<Record<ContactOutcome, number>> = { ...session.job.revalidationShifts };
        let claims = session.claims!;
        let stopCause: StopCause | undefined;
        let rejectedStrategy: AuthStrategy | undefined;
        let offset = 0;

        const updated = blocks.map((block, position) => {
            const step = steps[position]!;

            if (step.kind !== 'calls') {
                return block;
            }

            const slice = results.slice(offset, offset + step.calls.length);
            offset += step.calls.length;

            const application = applyContactStep(block, step, slice, { settings: session.job.settings, claims, now, phase });

            if (application.kind === 'applied') {
                claims = application.claims;

                if (application.shiftedTo) {
                    shifts[application.shiftedTo] = (shifts[application.shiftedTo] ?? 0) + 1;
                }
            } else if (application.kind === 'stopBlock') {
                stopCause ??= application.cause;
            } else {
                rejectedStrategy ??= application.strategy;
            }

            return application.block;
        });

        session.claims = claims;

        const before = blocks.map((block) => block.contact);
        const after = updated.map((block) => block.contact);
        const changedPositions = after.map((contact, position) => (contact !== before[position] ? position : -1)).filter((position) => position >= 0);
        let job: DispatchJob = {
            ...session.job,
            counts: tallyOutcomes(session.job.counts, changedPositions.map((position) => before[position]!), changedPositions.map((position) => after[position]!)),
            revalidationShifts: shifts,
            updatedAt: now,
        };

        if (rejectedStrategy !== undefined) {
            const reason = rejectedStrategy === 'bearer' ? 'bearer_token_rejected' : 'workspace_token_rejected';
            job = toFailed(job, { reason, detail: `Hablla refused the ${rejectedStrategy} token during ${phase}`, resumePhase: phase }, now);
        }

        session.job = await this.ports.store.update(job, changedPositions.map((position) => after[position]!));

        if (rejectedStrategy !== undefined) {
            return { blocks: updated, signal: { kind: 'yield' } };
        }

        return { blocks: updated, signal: stopCause ? { kind: 'stop', stop: { cause: stopCause } } : undefined };
    }

    /** True while the execution window still has room for a block or a round. */
    private hasTimeLeft(deadlineAt: number): boolean {
        return this.ports.clock.now() + CHUNK_TIME_RESERVE_MS < deadlineAt;
    }

    /** Runs one round of calls, keeping the job's interrupted-round bookkeeping. */
    private async executeRound(session: ContinueSession, calls: readonly HttpCall[]): Promise<readonly CallResult[]> {
        const tracked = trackInterruptedRounds(session.job, await this.ports.executor.executeAll(calls));

        session.job = tracked.job;

        return tracked.results;
    }

    /** Advances the cursor past a settled chunk and closes the phase when its work is done. */
    private async closeChunk(session: ContinueSession, phase: ChunkedPhase, chunk: readonly DispatchContact[]): Promise<LoopSignal> {
        const now = this.ports.clock.now();
        const advanced = advanceCursor(session.job, chunk, now);
        let job = advanced.job;

        if (!hasPhaseWork(job, phase)) {
            job = phase === 'resolving'
                ? toAwaitingConfirmation(job, now)
                : job.counts.inAudience === 0 ? toCompleted(job, now) : toAwaitingAudience(job, now);
        }

        session.job = await this.ports.store.update(job, []);

        if (advanced.waitUntil !== undefined && advanced.waitUntil > now && hasPhaseWork(session.job, phase)) {
            return { kind: 'stop', stop: { waitUntil: advanced.waitUntil } };
        }

        return { kind: 'next' };
    }

    /** Polls the audience count until it matches, fails, or the window closes. */
    private async waitForAudience(session: ContinueSession, deadlineAt: number): Promise<LoopSignal> {
        for (;;) {
            const [result] = await this.executeRound(session, [countAudience(buildAudienceQuery(session.job).query)]);
            const resolution = resolveAudienceCount(session.job, result!, this.ports.clock.now());

            if (resolution.kind !== 'wait' || this.ports.clock.now() + AUDIENCE_POLL_INTERVAL_MS + CHUNK_TIME_RESERVE_MS >= deadlineAt) {
                return this.persistSendPhase(session, resolution);
            }

            session.job = resolution.job;
            await this.ports.clock.sleep(AUDIENCE_POLL_INTERVAL_MS);
        }
    }

    /** Creates the campaign under a write-ahead marker, or reconciles an in-flight one once due. */
    private async sendCampaign(session: ContinueSession): Promise<LoopSignal> {
        const now = this.ports.clock.now();

        if (session.job.campaignSendState === 'inFlight') {
            if (!isCampaignReconcileDue(session.job, now)) {
                return { kind: 'yield' };
            }

            const [result] = await this.executeRound(session, [findCampaignsByName(dispatchName(session.job))]);

            return this.persistSendPhase(session, resolveCampaignReconciliation(session.job, result!, this.ports.clock.now()));
        }

        session.job = await this.ports.store.update(withCampaignInFlight(session.job, now), []);

        const result = await this.postCampaignOrClearMarker(session);

        return this.persistSendPhase(session, resolveCampaignCreation(session.job, result, this.ports.clock.now()));
    }

    /**
     * Posts the campaign. An executor rejection means nothing was sent (see
     * {@link CallExecutor}), so the marker is cleared before the error propagates and no
     * reconciliation is left behind for a POST that never happened.
     */
    private async postCampaignOrClearMarker(session: ContinueSession): Promise<CallResult> {
        try {
            const [result] = await this.executeRound(session, [createCampaign(buildCampaignBody(session.job))]);
            return result!;
        } catch (error) {
            session.job = await this.ports.store.update(withoutCampaignInFlight(session.job, this.ports.clock.now()), []);
            throw error;
        }
    }

    /** Persists a Bearer phase resolution and turns it into a loop signal. */
    private async persistSendPhase(session: ContinueSession, resolution: SendPhaseResolution): Promise<LoopSignal> {
        session.job = await this.ports.store.update(resolution.job, []);

        switch (resolution.kind) {
            case 'advanced':
                return { kind: 'next' };
            case 'wait':
                return { kind: 'yield' };
            case 'stop':
                return { kind: 'stop', stop: { cause: resolution.cause } };
        }
    }
}

/**
 * The payload of a successful catalog or creation call.
 *
 * @throws DispatchThrottledError when the call was throttled, not sent or lost to the
 *   network; DispatchValidationError naming the route and status otherwise.
 */
function requireSuccess(result: CallResult, route: string): unknown {
    if (result.kind !== 'completed') {
        throw new DispatchThrottledError(route);
    }

    if (!isSuccess(result)) {
        throw new DispatchValidationError([`${route} answered ${result.status}: ${truncateDetail(JSON.stringify(result.data) ?? '')}`]);
    }

    return payloadOf(result);
}
