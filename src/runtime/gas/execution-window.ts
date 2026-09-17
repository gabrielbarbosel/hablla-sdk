import type { ContinueOptions } from '../../sdk/domain/dispatch/workspace';

/** Hard wall-clock limit of one Apps Script execution. */
export const GAS_EXECUTION_LIMIT_MS = 360_000;

/** Slack added past the hard limit before another execution may take the job over. */
export const LEASE_MARGIN_MS = 30_000;

/**
 * The absolute window of an execution, computed once at its first line: work stops
 * starting at `startedAt + budgetMs`, and the lease outlives the hard limit of the
 * execution, so no execution still alive can outlive its own lease.
 *
 * @throws RangeError when the budget is not a positive integer below the hard limit.
 */
export function executionWindow(executionStartedAt: number, budgetMs: number): ContinueOptions {
    if (!Number.isInteger(budgetMs) || budgetMs <= 0 || budgetMs >= GAS_EXECUTION_LIMIT_MS) {
        throw new RangeError(`executionWindow: budgetMs must be a positive integer below ${GAS_EXECUTION_LIMIT_MS}, got ${budgetMs}`);
    }

    return {
        deadlineAt: executionStartedAt + budgetMs,
        leaseUntil: executionStartedAt + GAS_EXECUTION_LIMIT_MS + LEASE_MARGIN_MS,
    };
}
