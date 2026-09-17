/**
 * Estimate of the HTTP calls one dispatch needs, checked against the account's daily
 * quota before the job is stored. It is an estimate, not a ceiling: retries beyond one per
 * step, throttled calls that still count against the quota, and every `start` after a
 * failure can push a dispatch past it.
 */

import type { DispatchContact } from './types';
import { AUDIENCE_POLL_INTERVAL_MS, AUDIENCE_READY_TIMEOUT_MS, MAX_CALL_ATTEMPTS } from './constants';

/** Estimated HTTP calls of one dispatch, by token. */
export interface CallBudget {
    workspace: number;
    bearer: number;
    total: number;
}

/** Pages of the catalogs read by `plan`. */
export interface CatalogPages {
    roster: number;
    customFields: number;
}

/** Calls of one lookup: a person search per phone shape plus an attendance search per matching stored phone. */
const LOOKUP_CALLS = 4;

/** Lookups per contact: the preview and the send-time lookup. */
const LOOKUPS_PER_CONTACT = 2;

/** Writes of the longest plan: first name, unfollow, add owner, remove system owners, join. */
const MAX_WRITES_PER_CONTACT = 5;

/** Calls of the largest single step (a lookup stage or a reconciliation over both phone shapes). */
const LARGEST_STEP_CALLS = 2;

/**
 * Workspace calls estimated for one contact: both lookups, the longest write plan and the
 * retries of its largest step. A contact that retries several steps costs more.
 */
export const ESTIMATED_CALLS_PER_CONTACT = LOOKUP_CALLS * LOOKUPS_PER_CONTACT + MAX_WRITES_PER_CONTACT + MAX_CALL_ATTEMPTS * LARGEST_STEP_CALLS;

/** Bearer calls of one dispatch besides the custom-field pages: segmentation, counts, campaign and the read that resolves it. */
const FIXED_BEARER_CALLS = 1 + Math.ceil(AUDIENCE_READY_TIMEOUT_MS / AUDIENCE_POLL_INTERVAL_MS) + 1 + 1;

/**
 * Call estimate of a dispatch: {@link ESTIMATED_CALLS_PER_CONTACT} per contact in
 * `pendingLookup`, plus, per dispatch, the catalog pages, the segmentation, every count
 * until the audience timeout, the campaign and the read that resolves it. Per dispatch, not a
 * daily ledger: the app shows the number and does not fire two large dispatches in a day.
 */
export function estimateCallBudget(contacts: readonly DispatchContact[], catalogPages: CatalogPages): CallBudget {
    const contactsToProcess = contacts.filter((contact) => contact.outcome === 'pendingLookup').length;
    const workspace = catalogPages.roster + contactsToProcess * ESTIMATED_CALLS_PER_CONTACT;
    const bearer = catalogPages.customFields + FIXED_BEARER_CALLS;

    return { workspace, bearer, total: workspace + bearer };
}
