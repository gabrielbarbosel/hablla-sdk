/**
 * The `resolvingExclusions` phase: the operator's report filters turned into the phones
 * that must not be dispatched to, one page at a time, and applied to the contacts before
 * anything is written. The phase runs twice — once for the preview, so the operator sees
 * the excluded contacts, and once on the confirmed job right before `materializing`, so
 * nobody excluded gets an owner write, a first-name write or a place in the audience.
 */

import type { CallResult, HttpCall } from '../../../core/call-executor';
import type { StopCause } from './call-failures';
import type { ContactOutcome, DispatchContact, DispatchJob } from './types';
import { excludeContacts } from './audience';
import { classifyCallFailures, payloadOf, truncateDetail } from './call-failures';
import { EXCLUSION_PAGE_LIMIT, MAX_CALL_ATTEMPTS } from './constants';
import { tallyOutcomes, toFailed, tokenRejectedFailure } from './job-machine';
import { toFilteredPersonPage } from './payloads';
import { requireExclusionAttempts, requireExclusionCursor, requireExclusionPurpose } from './requirements';

/** The payload name the exclusion listing is reported under. */
const EXCLUSION_LISTING = 'exclusion listing';

/**
 * What one page of the exclusion listing resolved to:
 * - `page`: the phones it named, and whether it was the last page of the run;
 * - `failed`: the job failed and is persisted as returned;
 * - `stop`: the page has to be read again in a later execution; persist the job and cool down.
 */
export type ExclusionPageResolution =
    | { kind: 'page'; phones: readonly string[]; lastPage: boolean }
    | { kind: 'failed'; job: DispatchJob }
    | { kind: 'stop'; cause: StopCause; job: DispatchJob };

/** A read page applied to a job: the job with its counts and the contacts the page excluded. */
export interface AppliedExclusion {
    job: DispatchJob;
    excluded: readonly DispatchContact[];
}

/**
 * Pages one exclusion run reads for a universe of `universeSize` persons: one per full page
 * plus the short page that ends the run, since a full page is all the run knows about
 * another one existing. Never fewer than one, and the same count the run itself reaches, so
 * a universe the plan accepted never fails the ceiling at the run.
 */
export function exclusionPageCount(universeSize: number): number {
    return Math.floor(universeSize / EXCLUSION_PAGE_LIMIT) + 1;
}

/**
 * Applies one page of the exclusion listing. A refused token, or a 4xx that the same query
 * would earn again, fails the job at once instead of leaving it in the phase; an outcome the
 * read does not reveal (a 5xx or a lost request) is retried until `MAX_CALL_ATTEMPTS` are
 * spent, and then fails, so the job always reaches a verdict. A full page means there may be
 * another one: past `maxExclusionPages` the job fails with `exclusion_too_large`, because a
 * truncated exclusion would dispatch to people the operator left out.
 *
 * @throws UnexpectedPayloadError when a page does not hold the persons and phones the
 *   dispatch was built against, so nothing is excluded on a payload surprise.
 */
export function resolveExclusionPage(job: DispatchJob, call: HttpCall, result: CallResult, maxExclusionPages: number, now: number): ExclusionPageResolution {
    const failure = classifyCallFailures([result]);

    switch (failure?.kind) {
        case undefined:
            break;
        case 'stopBlock':
            return { kind: 'stop', cause: failure.cause, job };
        case 'tokenRejected':
            return { kind: 'failed', job: toFailed(job, tokenRejectedFailure([call], [result], EXCLUSION_LISTING, 'resolvingExclusions'), now) };
        case 'rejected':
            return {
                kind: 'failed',
                job: toFailed(job, { reason: 'exclusion_query_rejected', detail: `exclusion listing refused with ${failure.failure.status}: ${failure.failure.detail}`, resumePhase: 'resolvingExclusions' }, now),
            };
        case 'outcomeUnknown':
            return retryExclusionPage(job, failure.failure.detail, now);
    }

    const page = toFilteredPersonPage(payloadOf(result), EXCLUSION_LISTING);
    const lastPage = page.size < EXCLUSION_PAGE_LIMIT;

    if (!lastPage && requireExclusionCursor(job) >= maxExclusionPages) {
        return {
            kind: 'failed',
            job: toFailed(job, { reason: 'exclusion_too_large', detail: `the exclusion filters list more than ${maxExclusionPages} pages of ${EXCLUSION_PAGE_LIMIT} persons`, resumePhase: 'resolvingExclusions' }, now),
        };
    }

    return { kind: 'page', phones: page.phones, lastPage };
}

/**
 * Applies the phones of one page to the job's contacts: the outcome counts of the contacts
 * it excluded and, on the confirmed run, the same contacts as revalidation shifts, so the
 * drill-down shows how many left the audience after the preview. Applying a page twice
 * changes nothing, which is what makes a page safe to re-read after a killed execution.
 */
export function applyExcludedPhones(job: DispatchJob, contacts: readonly DispatchContact[], phones: readonly string[], now: number): AppliedExclusion {
    const after = excludeContacts(contacts, phones);
    const excluded = after.filter((contact, position) => contact !== contacts[position]);

    return {
        job: {
            ...job,
            counts: tallyOutcomes(job.counts, contacts, after),
            revalidationShifts: exclusionShifts(job, excluded.length),
            updatedAt: now,
        },
        excluded,
    };
}

/** The job's revalidation shifts, counting what the confirmed run excluded after the preview had resolved it. */
function exclusionShifts(job: DispatchJob, excludedCount: number): Readonly<Partial<Record<ContactOutcome, number>>> {
    if (requireExclusionPurpose(job) !== 'send' || excludedCount === 0) {
        return job.revalidationShifts;
    }

    return { ...job.revalidationShifts, excluded: (job.revalidationShifts.excluded ?? 0) + excludedCount };
}

/**
 * Retries the page in a later execution, after the transport cooldown the `stop` earns.
 * Once `MAX_CALL_ATTEMPTS` are spent the job fails with `exclusion_unresolved`, instead of
 * cooling down forever over a read that never resolves.
 */
function retryExclusionPage(job: DispatchJob, detail: string, now: number): ExclusionPageResolution {
    const attempts = requireExclusionAttempts(job) + 1;

    if (attempts < MAX_CALL_ATTEMPTS) {
        return { kind: 'stop', cause: 'interrupted', job: { ...job, exclusionAttempts: attempts, updatedAt: now } };
    }

    return {
        kind: 'failed',
        job: toFailed({ ...job, exclusionAttempts: 0 }, { reason: 'exclusion_unresolved', detail: truncateDetail(detail), resumePhase: 'resolvingExclusions' }, now),
    };
}
