import { describe, it, expect } from 'vitest';

import { MAX_BODY_LENGTH, renderChangeSummary, renderChangelogEntry, renderFailureIssue, renderPullRequestBody, resolveOutcome } from './codegen-summary.mjs';

/** A report with an empty diff, overridable per test. */
function reportWith(classification, diff = {}, reasons = []) {
    return {
        classification,
        guards: { parseOk: true, uploads: 7, endpointDropPct: 0, anomaly: reasons.length > 0, reasons },
        diff: {
            addedEndpoints: [],
            removedEndpoints: [],
            changedSignatures: [],
            extendedSignatures: [],
            removedExports: [],
            removedEnumValues: [],
            addedFiles: [],
            removedFiles: [],
            changedFiles: [],
            ...diff,
        },
    };
}

describe('resolveOutcome', () => {
    it('trusts the report classification of a successful pipeline', () => {
        expect(resolveOutcome(reportWith('changed'), 'success')).toBe('changed');
    });

    it('is failure when the pipeline failed or wrote no report', () => {
        expect(resolveOutcome(reportWith('additive'), 'failure')).toBe('failure');
        expect(resolveOutcome(null, 'success')).toBe('failure');
    });

    it('throws on a classification outside the contract', () => {
        expect(() => resolveOutcome(reportWith('minor'), 'success')).toThrow('unknown classification in report: "minor"');
    });
});

describe('renderChangeSummary', () => {
    it('lists the breaking sections before the additive ones and skips empty sections', () => {
        const summary = renderChangeSummary(reportWith('breaking', {
            addedEndpoints: ['GET /v1/meta/profile (meta)'],
            removedEndpoints: ['GET /v1/temp-tokens (tempTokens)'],
            removedExports: ['gen_tempTokens.ts#TempTokens'],
            changedFiles: ['gen_enums.ts'],
        }));

        expect(summary).toContain('**Classification:** `breaking` — endpoints +1 / -1 / ~0 incompatible / 0 extended.');
        expect(summary.indexOf('### Removed endpoints')).toBeLessThan(summary.indexOf('### Added endpoints'));
        expect(summary).toContain('- `gen_tempTokens.ts#TempTokens`');
        expect(summary).toContain('- changed `gen_enums.ts`');
        expect(summary).not.toContain('### Removed enum values');
    });

    it('shows both declarations of a changed signature', () => {
        const summary = renderChangeSummary(reportWith('breaking', {
            changedSignatures: [{ endpoint: 'GET /v1/tags (tags)', before: 'listTags(): Promise<A>', after: 'listTags(): Promise<B>' }],
        }));
        expect(summary).toContain('- `GET /v1/tags (tags)`\n  - before: `listTags(): Promise<A>`\n  - after: `listTags(): Promise<B>`');
    });

    it('is deterministic for the same report', () => {
        const report = reportWith('additive', { addedEndpoints: ['GET /a (x)'] });
        expect(renderChangeSummary(report)).toBe(renderChangeSummary(structuredClone(report)));
    });
});

/** A report whose summary is far above GitHub's body limit. */
function oversizedReport() {
    const addedEndpoints = Array.from({ length: 5000 }, (_, i) => `GET /v1/very/long/generated/route/number/${i} (resource)`);
    return reportWith('additive', { addedEndpoints });
}

describe('renderPullRequestBody', () => {
    it('stays under the GitHub body limit', () => {
        const body = renderPullRequestBody(oversizedReport());
        expect(body.length).toBeLessThan(MAX_BODY_LENGTH + 200);
        expect(body).toContain('_Truncated:');
    });

    it('is the plain summary when it fits', () => {
        const report = reportWith('breaking', { removedEndpoints: ['GET /a (x)'] });
        expect(renderPullRequestBody(report)).toBe(renderChangeSummary(report));
    });
});

describe('renderChangelogEntry', () => {
    it('heads the summary with the version and date', () => {
        expect(renderChangelogEntry(reportWith('changed', { changedFiles: ['gen_enums.ts'] }), '0.3.1', '2026-09-16')).toMatch(/^## v0\.3\.1 \(2026-09-16\)\n\n\*\*Classification:\*\* `changed`/);
    });

    it('is never truncated', () => {
        const entry = renderChangelogEntry(oversizedReport(), '0.3.1', '2026-09-16');
        expect(entry.length).toBeGreaterThan(MAX_BODY_LENGTH);
        expect(entry).not.toContain('_Truncated:');
        expect(entry).toContain('GET /v1/very/long/generated/route/number/4999 (resource)');
    });
});

describe('renderFailureIssue', () => {
    it('names the failed steps and explains a missing report', () => {
        const body = renderFailureIssue({
            report: null,
            steps: { install: { outcome: 'success' }, gates: { outcome: 'failure' } },
            runUrl: 'https://github.com/o/r/actions/runs/1',
        });
        expect(body).toContain('**Run:** https://github.com/o/r/actions/runs/1');
        expect(body).toContain('**Failed steps:** `gates`');
        expect(body).toContain('_No generation report was written._');
    });

    it('carries the guard reasons of a failure report', () => {
        const body = renderFailureIssue({
            report: reportWith('failure', {}, ['operation count 3 < 500']),
            steps: { pipeline: { outcome: 'failure' } },
            runUrl: 'https://x',
        });
        expect(body).toContain('### Guard reasons\n\n- operation count 3 < 500');
    });
});
