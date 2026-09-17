import { describe, it, expect } from 'vitest';
import { applyExcludedPhones, exclusionPageCount, resolveExclusionPage } from './exclusion';
import { createJob } from './job-machine';
import { prepareAudience } from './audience';
import { EXCLUSION_PAGE_LIMIT, FIRST_EXCLUSION_PAGE, MAX_CALL_ATTEMPTS } from './constants';
import { UnexpectedPayloadError } from './errors';
import { listFilteredPersonsPage } from './routes';
import { ROSTER, aRequest, aRow, completed } from './__fixtures__/builders';
import type { DispatchJob } from './types';

const NOW = 1_800_000_000_000;
const MAX_PAGES = 3;
const FILTERS = [{ type: 'in_segmentation', segmentation: '6a589ac29c70672890006862' }];
const CALL = listFilteredPersonsPage(FILTERS, FIRST_EXCLUSION_PAGE);

/** A job in the given exclusion run, over three rows whose phones end in 1, 2 and 3. */
function aJob(exclusionPurpose: 'preview' | 'send', overrides: Partial<DispatchJob> = {}): DispatchJob {
    const request = aRequest({ rows: [aRow('1'), aRow('2'), aRow('3')], exclusion: { phones: [], segmentationFilters: FILTERS } });

    return { ...createJob(prepareAudience(request, ROSTER), request, NOW), exclusionPurpose, ...overrides };
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

describe('resolveExclusionPage', () => {
    it('reads the phones of a page and calls a page shorter than the limit the last one', () => {
        const result = resolveExclusionPage(aJob('preview'), CALL, completed(200, aPage(['5551999000002'])), MAX_PAGES, NOW);

        expect(result).toEqual({ kind: 'page', phones: ['5551999000002'], lastPage: true });
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
        const applied = applyExcludedPhones(job, contacts, ['5551999000001', '5551999000003', '5551900000000'], NOW);

        expect(applied.excluded.map((contact) => contact.index)).toEqual([0, 2]);
        expect(applied.job.counts).toMatchObject({ excluded: 2, pendingLookup: 1 });
        expect(applied.job.revalidationShifts).toEqual({});
        expect(applied.job.updatedAt).toBe(NOW);
    });

    it('changes nothing when the same page is applied again', () => {
        const job = aJob('preview');
        const contacts = prepareAudience(aRequest({ rows: [aRow('1')], exclusion: { phones: [], segmentationFilters: FILTERS } }), ROSTER).contacts;
        const once = applyExcludedPhones(job, contacts, ['5551999000001'], NOW);
        const twice = applyExcludedPhones(once.job, [once.excluded[0]!], ['5551999000001'], NOW);

        expect(twice.excluded).toEqual([]);
        expect(twice.job.counts).toEqual(once.job.counts);
    });

    it('records the contacts the confirmed run excludes as revalidation shifts', () => {
        const job = aJob('send');
        const ready = prepareAudience(aRequest({ rows: [aRow('1'), aRow('2')], exclusion: { phones: [], segmentationFilters: FILTERS } }), ROSTER)
            .contacts.map((contact) => ({ ...contact, outcome: 'ready' as const }));
        const applied = applyExcludedPhones({ ...job, counts: { ...job.counts, pendingLookup: 0, ready: 2 } }, ready, ['5551999000002'], NOW);

        expect(applied.job.revalidationShifts).toEqual({ excluded: 1 });
        expect(applied.job.counts).toMatchObject({ excluded: 1, ready: 1 });
    });
});
