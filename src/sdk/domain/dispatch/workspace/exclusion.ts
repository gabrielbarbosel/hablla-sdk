/**
 * The `resolvingExclusions` phase: the operator's report filters turned into the phones
 * that must not be dispatched to, one page at a time, and applied to the contacts before
 * anything is written. The phase runs twice — once for the preview, so the operator sees
 * the excluded contacts, and once on the confirmed job right before `materializing`, so
 * nobody excluded gets an owner write, a first-name write or a place in the audience.
 * Each run starts by counting the universe its pages must cover, so a listing that ends
 * early fails the job instead of leaving people the operator excluded in the dispatch.
 */

import type { CallResult, HttpCall } from '../../../core/call-executor';
import type { StopCause } from './call-failures';
import type { FilteredPersonPage } from './payloads';
import type { ContactOutcome, DispatchContact, DispatchJob } from './types';
import { excludeContacts } from './audience';
import { classifyCallFailures, payloadOf, truncateDetail } from './call-failures';
import { readAudienceCount } from './campaign';
import { EXCLUSION_PAGE_LIMIT, FIRST_EXCLUSION_PAGE, MAX_CALL_ATTEMPTS } from './constants';
import { tallyOutcomes, toFailed, tokenRejectedFailure } from './job-machine';
import { toFilteredPersonPage } from './payloads';
import { requireExclusionAttempts, requireExclusionCursor, requireExclusionListed, requireExclusionPurpose, requireExclusionUniverseSize } from './requirements';

/** The payload name the exclusion listing is reported under. */
const EXCLUSION_LISTING = 'exclusion listing';

/** The payload name the count of the filters' universe is reported under. */
export const EXCLUSION_UNIVERSE_COUNT = 'exclusion universe count';

/**
 * What a failed read of the phase resolves to:
 * - `failed`: the job failed and is persisted as returned;
 * - `stop`: the read has to be repeated in a later execution; persist the job and cool down.
 */
export type ExclusionReadFailure =
    | { kind: 'failed'; job: DispatchJob }
    | { kind: 'stop'; cause: StopCause; job: DispatchJob };

/** What the count that opens a run resolved to; `universe` carries the job holding the reference. */
export type ExclusionUniverseResolution = ExclusionReadFailure | { kind: 'universe'; job: DispatchJob };

/** What one page of the exclusion listing resolved to; `page` carries the phones it named and whether it ends the run. */
export type ExclusionPageResolution = ExclusionReadFailure | { kind: 'page'; page: FilteredPersonPage; lastPage: boolean };

/** A read page applied to a job: the job with its counts and the contacts the page excluded. */
export interface AppliedExclusion {
    job: DispatchJob;
    excluded: readonly DispatchContact[];
}

/**
 * Pages one exclusion run reads for a universe of `universeSize` persons: one per full page
 * plus the short page that ends the run, since a full page is all the run knows about
 * another one existing. It sizes the cost and the ceiling, and does not promise the run
 * reads exactly this many pages: the plan counts the universe on the count route while the
 * run pages the listing route, and nothing proves the two enumerate the same population
 * (pending live check, spec 11.3), so a universe the plan accepted may still reach the
 * ceiling at the run — loud and bounded, which is why the run also checks its coverage.
 */
export function exclusionPageCount(universeSize: number): number {
    return Math.floor(universeSize / EXCLUSION_PAGE_LIMIT) + 1;
}

/**
 * Applies the count every run reads before its first page: the universe the pages have to
 * cover, kept on the job as the reference {@link resolveExclusionPage} checks the run
 * against, with the page attempts fresh for the first page. A failed count is classified
 * exactly as a page's is.
 *
 * @throws UnexpectedPayloadError when a 2xx does not carry a numeric count, so no run
 *   starts without a reference.
 */
export function resolveExclusionUniverse(job: DispatchJob, call: HttpCall, result: CallResult, now: number): ExclusionUniverseResolution {
    const failure = resolveExclusionReadFailure(job, call, result, EXCLUSION_UNIVERSE_COUNT, now);

    if (failure) {
        return failure;
    }

    return { kind: 'universe', job: { ...job, exclusionUniverseSize: readAudienceCount(result, EXCLUSION_UNIVERSE_COUNT), exclusionAttempts: 0, updatedAt: now } };
}

/**
 * Applies one page of the exclusion listing. A full page means there may be another one:
 * past `maxExclusionPages` the job fails with `exclusion_too_large`, because a truncated
 * exclusion would dispatch to people the operator left out. The page that ends the run
 * closes it only when the run listed the whole universe it counted; a shortfall fails with
 * `exclusion_incomplete` instead of handing over an exclusion that missed a page.
 *
 * @throws UnexpectedPayloadError when a page does not hold the persons and phones the
 *   dispatch was built against, so nothing is excluded on a payload surprise.
 */
export function resolveExclusionPage(job: DispatchJob, call: HttpCall, result: CallResult, maxExclusionPages: number, now: number): ExclusionPageResolution {
    const failure = resolveExclusionReadFailure(job, call, result, EXCLUSION_LISTING, now);

    if (failure) {
        return failure;
    }

    const page = toFilteredPersonPage(payloadOf(result), EXCLUSION_LISTING);

    if (page.size >= EXCLUSION_PAGE_LIMIT) {
        return requireExclusionCursor(job) >= maxExclusionPages ? tooLargeExclusion(job, maxExclusionPages, now) : { kind: 'page', page, lastPage: false };
    }

    const listed = requireExclusionListed(job) + page.size;
    const universeSize = requireExclusionUniverseSize(job);

    return listed < universeSize ? incompleteExclusion(job, listed, universeSize, now) : { kind: 'page', page, lastPage: true };
}

/**
 * Applies the phones of one page to the job's contacts: the outcome counts of the contacts
 * it excluded, the persons the run has listed so far and, on the confirmed run, the same
 * contacts as revalidation shifts, so the drill-down shows how many left the audience after
 * the preview. Re-applying a page whose write never landed changes nothing, which is what
 * makes a page safe to re-read after a killed execution.
 */
export function applyExcludedPhones(job: DispatchJob, contacts: readonly DispatchContact[], page: FilteredPersonPage, now: number): AppliedExclusion {
    const after = excludeContacts(contacts, page.phones);
    const excluded = after.filter((contact, position) => contact !== contacts[position]);

    return {
        job: {
            ...job,
            counts: tallyOutcomes(job.counts, contacts, after),
            revalidationShifts: exclusionShifts(job, excluded.length),
            exclusionListed: requireExclusionListed(job) + page.size,
            updatedAt: now,
        },
        excluded,
    };
}

/**
 * The failure a read of the phase earns, or `undefined` for a 2xx. A refused token, or a
 * 4xx that the same query would earn again, fails the job at once instead of leaving it in
 * the phase; an outcome the read does not reveal (a 5xx or a lost request) is retried until
 * `MAX_CALL_ATTEMPTS` are spent, and then fails, so the job always reaches a verdict.
 */
function resolveExclusionReadFailure(job: DispatchJob, call: HttpCall, result: CallResult, payload: string, now: number): ExclusionReadFailure | undefined {
    const failure = classifyCallFailures([result]);

    switch (failure?.kind) {
        case undefined:
            return undefined;
        case 'stopBlock':
            return { kind: 'stop', cause: failure.cause, job };
        case 'tokenRejected':
            return { kind: 'failed', job: toFailed(job, tokenRejectedFailure([call], [result], payload, 'resolvingExclusions'), now) };
        case 'rejected':
            return {
                kind: 'failed',
                job: toFailed(job, { reason: 'exclusion_query_rejected', detail: `${payload} refused with ${failure.failure.status}: ${failure.failure.detail}`, resumePhase: 'resolvingExclusions' }, now),
            };
        case 'outcomeUnknown':
            return retryExclusionRead(job, failure.failure.detail, now);
    }
}

/** The job's revalidation shifts, counting what the confirmed run excluded after the preview had resolved it. */
function exclusionShifts(job: DispatchJob, excludedCount: number): Readonly<Partial<Record<ContactOutcome, number>>> {
    if (requireExclusionPurpose(job) !== 'send' || excludedCount === 0) {
        return job.revalidationShifts;
    }

    return { ...job.revalidationShifts, excluded: (job.revalidationShifts.excluded ?? 0) + excludedCount };
}

/** A run whose universe needs more pages than the dispatch may read: it fails loud, never truncates in silence. */
function tooLargeExclusion(job: DispatchJob, maxExclusionPages: number, now: number): ExclusionReadFailure {
    return {
        kind: 'failed',
        job: toFailed(job, { reason: 'exclusion_too_large', detail: `the exclusion filters list more than ${maxExclusionPages} pages of ${EXCLUSION_PAGE_LIMIT} persons`, resumePhase: 'resolvingExclusions' }, now),
    };
}

/**
 * A run whose pages listed fewer persons than the universe it counted: a page was lost or
 * the listing ended early, and handing over now would dispatch to people the operator
 * excluded. The failed job is left at the first page without a reference, so a resume reads
 * the whole listing again against a fresh count — which is also how a universe that only
 * shrank while the run was reading clears the check on the next try.
 */
function incompleteExclusion(job: DispatchJob, listed: number, universeSize: number, now: number): ExclusionReadFailure {
    const restarted: DispatchJob = { ...job, exclusionCursor: FIRST_EXCLUSION_PAGE, exclusionAttempts: 0, exclusionUniverseSize: undefined, exclusionListed: 0 };

    return {
        kind: 'failed',
        job: toFailed(restarted, { reason: 'exclusion_incomplete', detail: `the exclusion listing ended at ${listed} of the ${universeSize} persons the filters count`, resumePhase: 'resolvingExclusions' }, now),
    };
}

/**
 * Retries the read in a later execution, after the transport cooldown the `stop` earns.
 * Once `MAX_CALL_ATTEMPTS` are spent the job fails with `exclusion_unresolved`, instead of
 * cooling down forever over a read that never resolves.
 */
function retryExclusionRead(job: DispatchJob, detail: string, now: number): ExclusionReadFailure {
    const attempts = requireExclusionAttempts(job) + 1;

    if (attempts < MAX_CALL_ATTEMPTS) {
        return { kind: 'stop', cause: 'interrupted', job: { ...job, exclusionAttempts: attempts, updatedAt: now } };
    }

    return {
        kind: 'failed',
        job: toFailed({ ...job, exclusionAttempts: 0 }, { reason: 'exclusion_unresolved', detail: truncateDetail(detail), resumePhase: 'resolvingExclusions' }, now),
    };
}
