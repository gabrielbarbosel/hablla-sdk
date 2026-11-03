/**
 * Estimate of the HTTP calls one dispatch needs, checked against the account's daily
 * quota before the job is stored. It is an estimate, not a ceiling: retries beyond one per
 * step, throttled calls that still count against the quota, and every `start` after a
 * failure can push a dispatch past it.
 */

import type { DispatchTuning } from './tuning';
import type { CallBudget, DispatchCallBudget, DispatchContact, DispatchJob } from './types';
import { LARGEST_STEP_CALLS } from './constants';
import { tuningOf } from './tuning';

/** Pages of the catalogs read by `plan`. */
export interface CatalogPages {
    roster: number;
    customFields: number;
}

/** Calls of one lookup: a person search per phone shape plus an attendance search per matching stored phone. */
const LOOKUP_CALLS = 4;

/** Lookups per contact: the preview and the send-time lookup. */
const LOOKUPS_PER_CONTACT = 2;

/** Writes of the longest plan: the row's person fields, unfollow, add owner, remove owners, join. */
const MAX_WRITES_PER_CONTACT = 5;

/** Runs of the exclusion phase: the preview and the confirmed one, which reads the pages again. */
export const EXCLUSION_RUNS_PER_DISPATCH = 2;

/**
 * Workspace calls estimated for one contact: both lookups, the longest write plan and the
 * retries of its largest step. A contact that retries several steps costs more.
 */
export function estimatedCallsPerContact(tuning: DispatchTuning): number {
    return LOOKUP_CALLS * LOOKUPS_PER_CONTACT + MAX_WRITES_PER_CONTACT + tuning.maxCallAttempts * LARGEST_STEP_CALLS;
}

/**
 * Call estimate of a dispatch under its tuning: {@link estimatedCallsPerContact} per
 * contact in `pendingLookup`, plus, per dispatch, the catalog pages, the segmentation, every
 * count until the audience timeout, the campaign and the read that resolves it. An
 * exclusion by filter adds the count `plan` reads its universe with and, per run, the count
 * that run checks its coverage against plus its pages. Per dispatch, not a daily ledger:
 * the app shows the number and does not fire two large dispatches in a day.
 *
 * @param exclusionPages Pages one exclusion run reads, or 0 when nothing is excluded by filter.
 */
export function estimateCallBudget(contacts: readonly DispatchContact[], catalogPages: CatalogPages, exclusionPages: number, tuning: DispatchTuning): CallBudget {
    const contactsToProcess = contacts.filter((contact) => contact.outcome === 'pendingLookup').length;
    const workspace = catalogPages.roster + contactsToProcess * estimatedCallsPerContact(tuning);
    const bearer = catalogPages.customFields + fixedBearerCalls(tuning) + exclusionBearerCalls(exclusionPages);

    return { workspace, bearer, total: workspace + bearer };
}

/** The ledger a job reports: its estimate, what it has spent, what is still expected and the quota of its tuning. */
export function callBudgetOf(job: Pick<DispatchJob, 'callEstimate' | 'callsSpent' | 'tuning'>): DispatchCallBudget {
    return {
        estimate: job.callEstimate,
        spent: job.callsSpent,
        remaining: Math.max(0, job.callEstimate.total - job.callsSpent),
        dailyCallQuota: tuningOf(job).dailyCallQuota,
    };
}

/** Bearer calls of one dispatch besides the custom-field pages: segmentation, counts, campaign and the read that resolves it. */
function fixedBearerCalls(tuning: DispatchTuning): number {
    return 1 + Math.ceil(tuning.audienceReadyTimeoutMs / tuning.audiencePollIntervalMs) + 1 + 1;
}

/** Bearer calls of the exclusion: the universe count `plan` reads, plus one count and the pages of every run. */
function exclusionBearerCalls(exclusionPages: number): number {
    return exclusionPages === 0 ? 0 : 1 + (1 + exclusionPages) * EXCLUSION_RUNS_PER_DISPATCH;
}
