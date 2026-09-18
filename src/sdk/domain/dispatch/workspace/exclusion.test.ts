import { describe, it, expect } from 'vitest';
import { applyExcludedPhones, exclusionPageCount, resolveExclusionPage, resolveExclusionUniverse } from './exclusion';
import { createJob } from './job-machine';
import { prepareAudience } from './audience';
import { EXCLUSION_PAGE_LIMIT, FIRST_EXCLUSION_PAGE, MAX_CALL_ATTEMPTS } from './constants';
import { UnexpectedPayloadError } from './errors';
import { countAudience, listFilteredPersonsPage } from './routes';
import { NO_CALLS_SPENT, ROSTER, aRequest, aRow, completed } from './__fixtures__/builders';
import type { DispatchJob } from './types';

const NOW = 1_800_000_000_000;
const MAX_PAGES = 3;
const FILTERS = [{ type: 'in_segmentation', segmentation: '6a589ac29c70672890006862' }];
const CALL = listFilteredPersonsPage(FILTERS, FIRST_EXCLUSION_PAGE);
const COUNT_CALL = countAudience(FILTERS);

/**
 * A job in the given exclusion run, over three rows whose phones end in 1, 2 and 3, with a
 * universe already counted (the pages of the run are what each case varies).
 */
function aJob(exclusionPurpose: 'preview' | 'send', overrides: Partial<DispatchJob> = {}): DispatchJob {
    const request = aRequest({ rows: [aRow('1'), aRow('2'), aRow('3')], exclusion: { phones: [], segmentationFilters: FILTERS } });

    return { ...createJob(prepareAudience(request, ROSTER), request, NOW, NO_CALLS_SPENT), exclusionPurpose, exclusionUniverseSize: 0, ...overrides };
}

/** A listing page holding one person per phone. */
function aPage(phones: readonly string[], size = phones.length): Record<string, unknown> {
    const results = phones.map((phone) => ({ phones: [{ type: 'personal', phone, is_whatsapp: true }] }));
    const filler = Array.from({ length: Math.max(0, size - results.length) }, () => ({ phones: [] }));

    return { results: [...results, ...filler] };
}

describe('exclusionPageCount', () => {
    it('counts the full pages plus the short page that ends the run', () => {
        expect(exclusionPageCount(0)).toBe(1);
        expect(exclusionPageCount(1)).toBe(1);
        expect(exclusionPageCount(EXCLUSION_PAGE_LIMIT)).toBe(2);
        expect(exclusionPageCount(EXCLUSION_PAGE_LIMIT + 1)).toBe(2);
        expect(exclusionPageCount(188_566)).toBe(189);
    });
});

describe('resolveExclusionUniverse', () => {
    it('keeps the counted universe as the reference of the run, with the page attempts fresh', () => {
        const resolution = resolveExclusionUniverse(aJob('preview', { exclusionUniverseSize: undefined, exclusionAttempts: 2 }), COUNT_CALL, completed(200, { count: 1_500, not_found: 0 }), NOW);

        expect(resolution).toMatchObject({ kind: 'universe', job: { exclusionUniverseSize: 1_500, exclusionAttempts: 0, updatedAt: NOW } });
    });

    it('classifies a failed count as a page failure is classified', () => {
        const refused = resolveExclusionUniverse(aJob('preview', { exclusionUniverseSize: undefined }), COUNT_CALL, completed(400, { message: 'bad filter' }), NOW);
        const unknown = resolveExclusionUniverse(aJob('preview', { exclusionUniverseSize: undefined }), COUNT_CALL, completed(500, { message: 'boom' }), NOW);

        expect(refused).toMatchObject({ kind: 'failed', job: { failure: { reason: 'exclusion_query_rejected', detail: expect.stringContaining('exclusion universe count'), resumePhase: 'resolvingExclusions' } } });
        expect(unknown).toMatchObject({ kind: 'stop', cause: 'interrupted', job: { exclusionAttempts: 1 } });
    });

    it('throws when the count answers a 2xx without a number, so no run starts without a reference', () => {
        expect(() => resolveExclusionUniverse(aJob('preview', { exclusionUniverseSize: undefined }), COUNT_CALL, completed(200, { results: [] }), NOW)).toThrow(UnexpectedPayloadError);
    });
});

describe('resolveExclusionPage', () => {
    it('reads the phones of a page and calls a page shorter than the limit the last one', () => {
        const result = resolveExclusionPage(aJob('preview'), CALL, completed(200, aPage(['5551999000002'])), MAX_PAGES, NOW);

        expect(result).toEqual({ kind: 'page', page: { phones: ['5551999000002'], size: 1 }, lastPage: true });
    });

    it('fails the run loud when the last page leaves the counted universe short', () => {
        const short = aJob('preview', { exclusionUniverseSize: EXCLUSION_PAGE_LIMIT + 500, exclusionListed: 0 });
        const failed = resolveExclusionPage(short, CALL, completed(200, aPage([], EXCLUSION_PAGE_LIMIT - 1)), MAX_PAGES, NOW);

        expect(failed).toMatchObject({ kind: 'failed', job: { phase: 'failed', failure: { reason: 'exclusion_incomplete', resumePhase: 'resolvingExclusions' } } });
        expect((failed as { job: DispatchJob }).job).toMatchObject({ exclusionCursor: FIRST_EXCLUSION_PAGE, exclusionListed: 0, exclusionUniverseSize: undefined });
    });

    it('ends the run when its pages covered the counted universe', () => {
        const covered = aJob('preview', { exclusionUniverseSize: EXCLUSION_PAGE_LIMIT + 1, exclusionListed: EXCLUSION_PAGE_LIMIT });

        expect(resolveExclusionPage(covered, CALL, completed(200, aPage(['5551999000002'])), MAX_PAGES, NOW)).toMatchObject({ kind: 'page', lastPage: true });
    });

    it('expects another page after a full one', () => {
        expect(resolveExclusionPage(aJob('preview'), CALL, completed(200, aPage([], EXCLUSION_PAGE_LIMIT)), MAX_PAGES, NOW)).toMatchObject({ kind: 'page', lastPage: false });
    });

    it('fails loud instead of truncating when the filters need more pages than allowed', () => {
        const atCeiling = aJob('preview', { exclusionCursor: MAX_PAGES });
        const failed = resolveExclusionPage(atCeiling, CALL, completed(200, aPage([], EXCLUSION_PAGE_LIMIT)), MAX_PAGES, NOW);

        expect(failed).toMatchObject({ kind: 'failed' });
        expect((failed as { job: DispatchJob }).job).toMatchObject({ phase: 'failed', failure: { reason: 'exclusion_too_large', resumePhase: 'resolvingExclusions' } });
    });

    it('fails the job when the report engine refuses the query, which it would refuse again', () => {
        const failed = resolveExclusionPage(aJob('preview'), CALL, completed(400, { message: 'bad filter' }), MAX_PAGES, NOW);

        expect(failed).toMatchObject({ kind: 'failed', job: { phase: 'failed', failure: { reason: 'exclusion_query_rejected', resumePhase: 'resolvingExclusions' } } });
    });

    it('fails the job when the Bearer token is refused', () => {
        const failed = resolveExclusionPage(aJob('send'), CALL, completed(401, { message: 'Unauthorized' }), MAX_PAGES, NOW);

        expect(failed).toMatchObject({ kind: 'failed', job: { failure: { reason: 'bearer_token_rejected', resumePhase: 'resolvingExclusions' } } });
    });

    it('cools down without spending an attempt when the wave is throttled or interrupted', () => {
        const throttled = resolveExclusionPage(aJob('preview'), CALL, { kind: 'throttled' }, MAX_PAGES, NOW);
        const interrupted = resolveExclusionPage(aJob('preview'), CALL, { kind: 'interrupted', message: 'fetchAll failed' }, MAX_PAGES, NOW);

        expect(throttled).toMatchObject({ kind: 'stop', cause: 'throttled', job: { exclusionAttempts: 0 } });
        expect(interrupted).toMatchObject({ kind: 'stop', cause: 'interrupted', job: { exclusionAttempts: 0 } });
    });

    it('retries a page whose outcome is unknown and fails once the attempts are spent', () => {
        const retried = resolveExclusionPage(aJob('preview'), CALL, completed(500, { message: 'boom' }), MAX_PAGES, NOW);

        expect(retried).toMatchObject({ kind: 'stop', cause: 'interrupted', job: { exclusionAttempts: 1 } });

        const spent = resolveExclusionPage(aJob('preview', { exclusionAttempts: MAX_CALL_ATTEMPTS - 1 }), CALL, { kind: 'transportFailed', message: 'socket hang up' }, MAX_PAGES, NOW);

        expect(spent).toMatchObject({ kind: 'failed', job: { phase: 'failed', failure: { reason: 'exclusion_unresolved', detail: 'socket hang up', resumePhase: 'resolvingExclusions' } } });
    });

    it('throws on a page that is not shaped as captured, so nothing is excluded on a surprise', () => {
        expect(() => resolveExclusionPage(aJob('preview'), CALL, completed(200, { count: 1 }), MAX_PAGES, NOW)).toThrow(UnexpectedPayloadError);
    });
});

describe('applyExcludedPhones', () => {
    it('excludes the contacts a page names and counts them', () => {
        const job = aJob('preview');
        const contacts = prepareAudience(aRequest({ rows: [aRow('1'), aRow('2'), aRow('3')], exclusion: { phones: [], segmentationFilters: FILTERS } }), ROSTER).contacts;
        const applied = applyExcludedPhones(job, contacts, { phones: ['5551999000001', '5551999000003', '5551900000000'], size: 3 }, NOW);

        expect(applied.excluded.map((contact) => contact.index)).toEqual([0, 2]);
        expect(applied.job.counts).toMatchObject({ excluded: 2, pendingLookup: 1 });
        expect(applied.job.revalidationShifts).toEqual({});
        expect(applied.job.exclusionListed).toBe(3);
        expect(applied.job.updatedAt).toBe(NOW);
    });

    it('changes nothing when the same page is applied again', () => {
        const job = aJob('preview');
        const contacts = prepareAudience(aRequest({ rows: [aRow('1')], exclusion: { phones: [], segmentationFilters: FILTERS } }), ROSTER).contacts;
        const once = applyExcludedPhones(job, contacts, { phones: ['5551999000001'], size: 1 }, NOW);
        const twice = applyExcludedPhones(once.job, [once.excluded[0]!], { phones: ['5551999000001'], size: 1 }, NOW);

        expect(twice.excluded).toEqual([]);
        expect(twice.job.counts).toEqual(once.job.counts);
    });

    it('records the contacts the confirmed run excludes as revalidation shifts', () => {
        const job = aJob('send');
        const ready = prepareAudience(aRequest({ rows: [aRow('1'), aRow('2')], exclusion: { phones: [], segmentationFilters: FILTERS } }), ROSTER)
            .contacts.map((contact) => ({ ...contact, outcome: 'ready' as const }));
        const applied = applyExcludedPhones({ ...job, counts: { ...job.counts, pendingLookup: 0, ready: 2 } }, ready, { phones: ['5551999000002'], size: 1 }, NOW);

        expect(applied.job.revalidationShifts).toEqual({ excluded: 1 });
        expect(applied.job.counts).toMatchObject({ excluded: 1, ready: 1 });
    });
});
