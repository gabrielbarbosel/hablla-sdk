/**
 * Deterministic human-facing text for the codegen cycle, rendered only from
 * `generation-report.json`: the run outcome the workflow routes on, the change
 * summary used as PR body and CHANGELOG entry, and the failure issue body. No
 * LLM and no network, so the same report always yields the same text.
 *
 * Usage:
 *   node scripts/codegen-summary.mjs outcome --report=generation-report.json --pipeline=success
 *   node scripts/codegen-summary.mjs summary --report=generation-report.json --out=summary.md
 *   node scripts/codegen-summary.mjs failure --report=generation-report.json --steps='<toJSON(steps)>' --run-url=https://… --out=issue.md
 */

import * as fs from 'node:fs';

import { isEntryPoint, parseCommandLine, readReportIfPresent } from './cli.mjs';

/** Every classification the generator may report. */
export const CLASSIFICATIONS = ['failure', 'breaking', 'additive', 'changed', 'noop'];

/** GitHub rejects issue and PR bodies above 65536 characters; stay clear of it. */
export const MAX_BODY_LENGTH = 60000;

/**
 * The outcome the workflow routes on. A crashed pipeline or a missing report is
 * a failure; an unknown classification means the report contract drifted and
 * throws instead of being guessed.
 * @param {object | null} report The parsed report, or `null` when absent.
 * @param {string} pipelineOutcome The pipeline step outcome (`success`, `failure`, …).
 * @returns {string} One of {@link CLASSIFICATIONS}.
 */
export function resolveOutcome(report, pipelineOutcome) {
    if (pipelineOutcome !== 'success' || !report) return 'failure';
    if (!CLASSIFICATIONS.includes(report.classification)) {
        throw new Error(`unknown classification in report: ${JSON.stringify(report.classification)}`);
    }
    return report.classification;
}

/**
 * A markdown section with one bullet per item, or nothing when there are no items.
 * @param {string} title Section heading.
 * @param {string[]} bullets Bullet contents.
 * @returns {string[]} Lines.
 */
function section(title, bullets) {
    if (bullets.length === 0) return [];
    return [`### ${title}`, '', ...bullets.map((bullet) => `- ${bullet}`), ''];
}

/**
 * Bullets for signature pairs, showing both declarations.
 * @param {{ endpoint: string, before: string, after: string }[]} signatures
 * @returns {string[]}
 */
function signatureBullets(signatures) {
    return signatures.map(({ endpoint, before, after }) => `\`${endpoint}\`\n  - before: \`${before}\`\n  - after: \`${after}\``);
}

/**
 * Truncate a body to {@link MAX_BODY_LENGTH}, pointing at the full report.
 * @param {string} markdown The rendered body.
 * @returns {string}
 */
function limitLength(markdown) {
    if (markdown.length <= MAX_BODY_LENGTH) return markdown;
    return `${markdown.slice(0, MAX_BODY_LENGTH)}\n\n_Truncated: the full diff is in the \`generation-report\` artifact of the run._\n`;
}

/**
 * Render the change summary of a report: headline counts, then one section per
 * kind of change, most severe first.
 * @param {object} report The parsed generation report.
 * @returns {string} Markdown.
 */
export function renderChangeSummary(report) {
    const diff = report.diff;
    const code = (value) => `\`${value}\``;
    const lines = [
        `**Classification:** ${code(report.classification)} — endpoints +${diff.addedEndpoints.length} / -${diff.removedEndpoints.length} / ~${diff.changedSignatures.length} incompatible / ${diff.extendedSignatures.length} extended.`,
        '',
        ...section('Guard reasons', report.guards.reasons),
        ...section('Removed endpoints', diff.removedEndpoints.map(code)),
        ...section('Incompatible signature changes', signatureBullets(diff.changedSignatures)),
        ...section('Removed exports', diff.removedExports.map(code)),
        ...section('Removed enum values', diff.removedEnumValues.map(code)),
        ...section('Added endpoints', diff.addedEndpoints.map(code)),
        ...section('Extended signatures (new optional query keys)', signatureBullets(diff.extendedSignatures)),
        ...section('Files', [
            ...diff.addedFiles.map((file) => `added ${code(file)}`),
            ...diff.removedFiles.map((file) => `removed ${code(file)}`),
            ...diff.changedFiles.map((file) => `changed ${code(file)}`),
        ]),
    ];
    return limitLength(`${lines.join('\n').trimEnd()}\n`);
}

/**
 * Render a CHANGELOG entry for a release.
 * @param {object} report The parsed generation report.
 * @param {string} version The released version (no `v`).
 * @param {string} date ISO date (`YYYY-MM-DD`).
 * @returns {string} Markdown.
 */
export function renderChangelogEntry(report, version, date) {
    return `## v${version} (${date})\n\n${renderChangeSummary(report)}`;
}

/**
 * Render the failure issue body (or comment) for a run that changed nothing.
 * @param {{ report: object | null, steps: Record<string, { outcome: string }>, runUrl: string }} input
 *   `steps` is the workflow's `toJSON(steps)`.
 * @returns {string} Markdown.
 */
export function renderFailureIssue({ report, steps, runUrl }) {
    const failedSteps = Object.entries(steps).filter(([, step]) => step.outcome === 'failure').map(([id]) => `\`${id}\``);
    const lines = [
        'The codegen run failed; nothing was committed, tagged or proposed.',
        '',
        `**Run:** ${runUrl}`,
        `**Failed steps:** ${failedSteps.length ? failedSteps.join(', ') : '(none recorded)'}`,
        '',
    ];
    const details = report ? renderChangeSummary(report) : '_No generation report was written: the pipeline did not reach the report stage._\n';
    return limitLength(`${lines.join('\n')}${details}`);
}

/** CLI entry: dispatch on the command, writing to `--out` or stdout. */
function main() {
    const { command, flags } = parseCommandLine(process.argv.slice(2), ['report', 'pipeline', 'out', 'steps', 'run-url']);
    if (!flags.report) throw new Error('--report is required');
    const report = readReportIfPresent(flags.report);

    if (command === 'outcome') {
        if (!flags.pipeline) throw new Error('--pipeline is required');
        process.stdout.write(`outcome=${resolveOutcome(report, flags.pipeline)}\n`);
        return;
    }
    if (!flags.out) throw new Error('--out is required');
    if (command === 'summary') {
        if (!report) throw new Error(`report not found: ${flags.report}`);
        fs.writeFileSync(flags.out, renderChangeSummary(report));
        return;
    }
    if (command === 'failure') {
        if (!flags.steps || !flags['run-url']) throw new Error('--steps and --run-url are required');
        fs.writeFileSync(flags.out, renderFailureIssue({ report, steps: JSON.parse(flags.steps), runUrl: flags['run-url'] }));
        return;
    }
    throw new Error(`unknown command: ${command} (expected outcome | summary | failure)`);
}

if (isEntryPoint(import.meta.url)) {
    try {
        main();
    } catch (error) {
        console.error(`[codegen-summary] FAILED: ${error.message}`);
        process.exit(1);
    }
}
