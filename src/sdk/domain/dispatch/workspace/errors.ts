import type { DispatchJobPhase, ResumePhase } from './types';

/** The request is invalid; every problem found is listed at once. */
export class DispatchValidationError extends Error {
    constructor(readonly problems: readonly string[]) {
        super(`Invalid workspace dispatch request: ${problems.join('; ')}`);
        this.name = 'DispatchValidationError';
    }
}

/** A catalog read or a creation was rate limited or never sent; the operator should retry in a minute. */
export class DispatchThrottledError extends Error {
    constructor(readonly route: string) {
        super(`Hablla rate limited ${route}; try again in one minute`);
        this.name = 'DispatchThrottledError';
    }
}

/** A catalog read or a creation was lost to the network, so whether it was applied is unknown. */
export class DispatchTransportError extends Error {
    constructor(readonly route: string, readonly detail: string) {
        super(`Hablla did not answer ${route}: ${detail}`);
        this.name = 'DispatchTransportError';
    }
}

/** Another job with the same fingerprint blocks this one (resume it, abandon it or confirm a repeat). */
export class DuplicateDispatchError extends Error {
    constructor(readonly jobId: string, readonly phase: DispatchJobPhase, readonly resumePhase?: ResumePhase) {
        super(`A dispatch with the same audience already exists: job ${jobId} in phase ${phase}`);
        this.name = 'DuplicateDispatchError';
    }
}

/** No job with this id exists in the store. */
export class JobNotFoundError extends Error {
    constructor(readonly jobId: string) {
        super(`Dispatch job ${jobId} was not found`);
        this.name = 'JobNotFoundError';
    }
}

/** The job was archived: its header is still stored, its contacts are gone, so no answer can page them. */
export class ArchivedJobError extends Error {
    constructor(readonly jobId: string) {
        super(`Dispatch job ${jobId} is archived; its contacts were removed`);
        this.name = 'ArchivedJobError';
    }
}

/** Another execution holds the job's lease. */
export class JobBusyError extends Error {
    constructor(readonly jobId: string) {
        super(`Dispatch job ${jobId} is being processed by another execution`);
        this.name = 'JobBusyError';
    }
}

/** The stored revision moved on: another execution owns the job now. */
export class StaleJobError extends Error {
    constructor(readonly jobId: string, readonly expectedRevision: number) {
        super(`Dispatch job ${jobId} is no longer at revision ${expectedRevision}`);
        this.name = 'StaleJobError';
    }
}

/** The requested transition is not allowed from the job's current phase. */
export class InvalidJobTransitionError extends Error {
    constructor(readonly jobId: string, readonly from: DispatchJobPhase, readonly transition: string) {
        super(`Dispatch job ${jobId} cannot ${transition} from phase ${from}`);
        this.name = 'InvalidJobTransitionError';
    }
}

/** The estimated HTTP calls of this dispatch exceed the configured daily quota. */
export class CallBudgetExceededError extends Error {
    constructor(readonly budget: { workspace: number; bearer: number; total: number }, readonly dailyCallQuota: number) {
        super(`Dispatch is estimated to need ${budget.total} HTTP calls, above the daily quota of ${dailyCallQuota}`);
        this.name = 'CallBudgetExceededError';
    }
}

/** A Hablla payload does not have the shape the dispatch was built against. */
export class UnexpectedPayloadError extends Error {
    constructor(readonly payload: string, readonly detail: string) {
        super(`Unexpected ${payload} payload: ${detail}`);
        this.name = 'UnexpectedPayloadError';
    }
}
