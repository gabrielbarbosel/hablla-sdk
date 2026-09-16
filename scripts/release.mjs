/**
 * Deterministic release driver for the codegen CI/CD, in two steps so the
 * verification gates run between them:
 *
 *   prepare — decide the bump from the report, write the version into
 *             `package.json` AND `package-lock.json`, prepend the CHANGELOG
 *             entry, then rebuild the RPO/GAS bundles (their banner carries the
 *             version). Used by every releasable run: additive and changed runs
 *             publish right after the gates; breaking runs ship the prepared tree
 *             as a pull request.
 *   publish — on `main` only, for additive/changed runs: commit
 *             {@link RELEASE_PATHS}, create the annotated tag and push.
 *   paths   — print {@link RELEASE_PATHS}, one per line (the PR step stages the same set).
 *
 * Every decision is a pure function of the report and the current version — no
 * LLM, no network, no randomness.
 *
 * Usage:
 *   node scripts/release.mjs prepare [--report=generation-report.json]
 *   node scripts/release.mjs publish [--report=generation-report.json]
 *   node scripts/release.mjs paths
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { isEntryPoint, parseCommandLine, readReportIfPresent, REPO_ROOT } from './cli.mjs';
import { renderChangelogEntry } from './codegen-summary.mjs';

/** Paths a release commits: the generated SDK surface, its version and the deployable bundles. */
export const RELEASE_PATHS = [
    'package.json',
    'package-lock.json',
    'CHANGELOG.md',
    'src/sdk/client.ts',
    'src/sdk/resources',
    'src/generator/openapi.json',
    'assets/rpo',
    'assets/gas',
];

/** Classifications a release can be prepared for. */
const PREPARABLE = ['additive', 'changed', 'breaking'];

/** Classifications published straight to `main`; breaking ones go through a reviewed pull request. */
const PUBLISHABLE = ['additive', 'changed'];

/** The only branch releases are published from. */
const RELEASE_BRANCH = 'main';

/**
 * Decide the semver bump for a classification. In `0.x` the minor slot is the
 * breaking one (a caret range never crosses it), so breaking -> minor and every
 * compatible change -> patch. From `1.0.0` on: breaking -> major, additive ->
 * minor, changed -> patch.
 * @param {string} classification A releasable classification.
 * @param {string} version The current `MAJOR.MINOR.PATCH` version.
 * @returns {'major' | 'minor' | 'patch'}
 */
export function decideBump(classification, version) {
    if (!PREPARABLE.includes(classification)) throw new Error(`classification "${classification}" is not releasable`);
    const isInitialDevelopment = parseVersion(version)[0] === 0;
    if (classification === 'breaking') return isInitialDevelopment ? 'minor' : 'major';
    if (classification === 'additive' && !isInitialDevelopment) return 'minor';
    return 'patch';
}

/**
 * Split a `MAJOR.MINOR.PATCH` version into numbers.
 * @param {string} version
 * @returns {[number, number, number]}
 */
function parseVersion(version) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match) throw new Error(`unsupported version (need MAJOR.MINOR.PATCH): ${version}`);
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Apply a bump to a `MAJOR.MINOR.PATCH` version string.
 * @param {string} version Current version.
 * @param {'major' | 'minor' | 'patch'} bump Bump kind.
 * @returns {string} The next version.
 */
export function applyBump(version, bump) {
    const [major, minor, patch] = parseVersion(version);
    if (bump === 'major') return `${major + 1}.0.0`;
    if (bump === 'minor') return `${major}.${minor + 1}.0`;
    return `${major}.${minor}.${patch + 1}`;
}

/**
 * A copy of `package-lock.json` carrying the new root version, in both places npm records it.
 * @param {object} lock Parsed lockfile.
 * @param {string} version New version.
 * @returns {object}
 */
export function withLockVersion(lock, version) {
    if (!lock.packages?.['']) throw new Error('package-lock.json has no root package entry');
    return { ...lock, version, packages: { ...lock.packages, '': { ...lock.packages[''], version } } };
}

/** Title line every CHANGELOG starts with. */
const CHANGELOG_TITLE = '# Changelog';

/**
 * Insert a release entry right below the CHANGELOG title, newest first.
 * @param {string | null} existing Current CHANGELOG content, or `null` when there is none.
 * @param {string} entry The rendered entry.
 * @returns {string}
 */
export function prependChangelog(existing, entry) {
    const previous = existing === null ? '' : existing.replace(new RegExp(`^${CHANGELOG_TITLE}\\n+`), '');
    return `${CHANGELOG_TITLE}\n\n${entry.trimEnd()}\n${previous ? `\n${previous}` : ''}`;
}

/**
 * Run `git` from the repo root, returning trimmed stdout.
 * @param {string[]} args Git arguments.
 * @returns {string}
 */
function git(args) {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

/** Read a JSON file under the repo root. */
function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
}

/** Write a JSON file under the repo root in npm's own format. */
function writeJson(relativePath, value) {
    fs.writeFileSync(path.join(REPO_ROOT, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Read the report and require a classification from `allowed`.
 * @param {string} reportPath
 * @param {string[]} allowed
 */
function requireReport(reportPath, allowed) {
    const report = readReportIfPresent(reportPath);
    if (!report) throw new Error(`report not found: ${reportPath} (did the generator run?)`);
    if (!allowed.includes(report.classification)) {
        throw new Error(`classification is "${report.classification}"; this step only handles ${allowed.join(' | ')}`);
    }
    return report;
}

/** Configure the codegen bot as committer when the checkout has no identity (`git config --get` exits 1 when unset). */
function ensureGitIdentity() {
    const hasConfig = (key) => {
        try {
            return git(['config', '--get', key]).length > 0;
        } catch {
            return false;
        }
    };
    if (!hasConfig('user.name')) git(['config', 'user.name', 'hablla-codegen[bot]']);
    if (!hasConfig('user.email')) git(['config', 'user.email', 'hablla-codegen[bot]@users.noreply.github.com']);
}

/** Fail when the tag for a version already exists. */
function requireFreshTag(tag) {
    if (git(['tag', '--list', tag])) throw new Error(`tag ${tag} already exists`);
}

/** Recompile the RPO and GAS bundles so they embed the regenerated SDK and the new version. */
function rebuildEnvBundles() {
    execFileSync('node', ['tooling/build-rpo.js'], { cwd: REPO_ROOT, stdio: 'inherit' });
    execFileSync('node', ['tooling/build-gas.js'], { cwd: REPO_ROOT, stdio: 'inherit' });
}

/** Bump the version, write the CHANGELOG and rebuild the bundles; no git writes. */
function prepare(reportPath) {
    const report = requireReport(reportPath, PREPARABLE);
    const currentVersion = readJson('package.json').version;
    const bump = decideBump(report.classification, currentVersion);
    const nextVersion = applyBump(currentVersion, bump);
    requireFreshTag(`v${nextVersion}`);

    writeJson('package.json', { ...readJson('package.json'), version: nextVersion });
    writeJson('package-lock.json', withLockVersion(readJson('package-lock.json'), nextVersion));

    const changelogPath = path.join(REPO_ROOT, 'CHANGELOG.md');
    const existing = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : null;
    const date = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(changelogPath, prependChangelog(existing, renderChangelogEntry(report, nextVersion, date)));

    rebuildEnvBundles();
    console.log(`[release] prepared ${report.classification}: ${currentVersion} -> ${nextVersion} (${bump})`);
}

/** Commit the prepared release, tag it and push; only from the release branch. */
function publish(reportPath) {
    const report = requireReport(reportPath, PUBLISHABLE);
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (branch !== RELEASE_BRANCH) throw new Error(`releases are published from ${RELEASE_BRANCH} only (current: ${branch})`);

    const tag = `v${readJson('package.json').version}`;
    requireFreshTag(tag);

    ensureGitIdentity();
    git(['add', '--', ...RELEASE_PATHS.filter((releasePath) => fs.existsSync(path.join(REPO_ROOT, releasePath)))]);
    const diff = report.diff;
    const body = `Endpoints +${diff.addedEndpoints.length} / -${diff.removedEndpoints.length}; ${diff.extendedSignatures.length} extended; ${diff.changedFiles.length} generated files changed. See CHANGELOG.md.`;
    git(['commit', '-m', `chore(codegen): ${report.classification} regen, release ${tag}`, '-m', body]);
    git(['tag', '-a', tag, '-m', `${tag} (codegen ${report.classification} release)`]);
    git(['push', '--follow-tags', 'origin', 'HEAD']);
    console.log(`[release] pushed commit + ${tag}.`);
}

/** CLI entry. */
function main() {
    const { command, flags } = parseCommandLine(process.argv.slice(2), ['report']);
    const reportPath = path.resolve(REPO_ROOT, flags.report ?? 'generation-report.json');
    if (command === 'prepare') prepare(reportPath);
    else if (command === 'publish') publish(reportPath);
    else if (command === 'paths') process.stdout.write(`${RELEASE_PATHS.join('\n')}\n`);
    else throw new Error(`unknown command: ${command} (expected prepare | publish | paths)`);
}

if (isEntryPoint(import.meta.url)) {
    try {
        main();
    } catch (error) {
        console.error(`[release] FAILED: ${error.message}`);
        process.exit(1);
    }
}
