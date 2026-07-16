/**
 * Deterministic release driver for the codegen CI/CD.
 *
 * Reads the generator's `generation-report.json`, decides the semver bump from
 * the reported endpoint diff, writes the new version into `package.json`, then
 * (unless `--dry-run`) commits the generated SDK, creates an annotated tag and
 * pushes with `--follow-tags`.
 *
 * This is the ADDITIVE branch of the pipeline only: breaking changes are routed
 * to a pull request and failures to an issue upstream, so this script refuses to
 * tag anything whose classification is not `additive` (override with `--force`).
 *
 * The bump is a pure function of the report, so re-running on the same report
 * yields the same version — no LLM, no network, no randomness.
 *
 * Usage:
 *   node scripts/release.mjs [--report=path] [--dry-run] [--force]
 *
 * The report contract this script depends on (subset of the full report the
 * generator emits):
 *
 *   {
 *     "classification": "additive" | "breaking" | "failure" | "noop",
 *     "diff": {
 *       "addedEndpoints":     string[],   // e.g. "GET /v2/workspaces/{id}/foo"
 *       "removedEndpoints":   string[],
 *       "changedSignatures":  { endpoint: string, before: string, after: string }[]
 *     }
 *   }
 *
 * Bump rule (first match wins):
 *   - major : any removedEndpoints or changedSignatures  (breaking surface)
 *   - minor : any addedEndpoints                          (new surface)
 *   - patch : otherwise                                   (regen / doc only)
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Paths that `release.mjs` is allowed to stage into the release commit. */
const RELEASE_PATHS = ['package.json', 'CHANGELOG.md', 'src/sdk/resources', 'src/generator/openapi.json', 'assets/rpo', 'assets/gas'];

/**
 * The environment bundles (RPO isolate classes + GAS blob) are the compiled,
 * DEPLOYED artifact of the SDK source — they must be recompiled from the just-
 * regenerated resources or a release ships stale isolate/GAS code (the deployed
 * class keeps running the old surface). Regenerated here so no release can forget.
 */
function rebuildEnvBundles() {
    execFileSync('node', ['tooling/build-rpo.js'], { cwd: REPO_ROOT, stdio: 'inherit' });
    execFileSync('node', ['tooling/build-gas.js'], { cwd: REPO_ROOT, stdio: 'inherit' });
}

/**
 * Parse `--key=value` / `--flag` style argv into a plain object.
 * @param {string[]} argv Raw arguments (without node/script).
 * @returns {{ report: string, dryRun: boolean, force: boolean }}
 */
function parseArgs(argv) {
    const args = { report: path.join(REPO_ROOT, 'generation-report.json'), dryRun: false, force: false };
    for (const raw of argv) {
        if (raw === '--dry-run') args.dryRun = true;
        else if (raw === '--force') args.force = true;
        else if (raw.startsWith('--report=')) args.report = path.resolve(REPO_ROOT, raw.slice('--report='.length));
        else throw new Error(`unknown argument: ${raw}`);
    }
    return args;
}

/**
 * Read and minimally validate the generation report.
 * @param {string} reportPath Absolute path to `generation-report.json`.
 * @returns {{ classification: string, diff: { addedEndpoints: string[], removedEndpoints: string[], changedSignatures: unknown[] } }}
 */
function readReport(reportPath) {
    if (!fs.existsSync(reportPath)) {
        throw new Error(`report not found: ${reportPath} (did the generator run?)`);
    }
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const diff = report.diff ?? {};
    return {
        classification: report.classification ?? 'failure',
        diff: {
            addedEndpoints: diff.addedEndpoints ?? [],
            removedEndpoints: diff.removedEndpoints ?? [],
            changedSignatures: diff.changedSignatures ?? [],
        },
    };
}

/**
 * Decide the semver bump kind purely from the reported diff.
 * @param {{ addedEndpoints: string[], removedEndpoints: string[], changedSignatures: unknown[] }} diff
 * @returns {'major' | 'minor' | 'patch'}
 */
function decideBump(diff) {
    if (diff.removedEndpoints.length > 0 || diff.changedSignatures.length > 0) return 'major';
    if (diff.addedEndpoints.length > 0) return 'minor';
    return 'patch';
}

/**
 * Apply a bump to a `MAJOR.MINOR.PATCH` version string.
 * @param {string} version Current version (semver core, no pre-release).
 * @param {'major' | 'minor' | 'patch'} bump Bump kind.
 * @returns {string} The next version.
 */
function applyBump(version, bump) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match) throw new Error(`unsupported version (need MAJOR.MINOR.PATCH): ${version}`);
    let [major, minor, patch] = match.slice(1).map(Number);
    if (bump === 'major') { major += 1; minor = 0; patch = 0; }
    else if (bump === 'minor') { minor += 1; patch = 0; }
    else { patch += 1; }
    return `${major}.${minor}.${patch}`;
}

/**
 * Run `git` with the given args from the repo root, returning trimmed stdout.
 * @param {string[]} args Git arguments.
 * @returns {string}
 */
function git(args) {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

/** Ensure a committer identity exists, defaulting to the codegen bot. */
function ensureGitIdentity() {
    const has = (key) => {
        try { return git(['config', '--get', key]).length > 0; } catch { return false; }
    };
    if (!has('user.name')) git(['config', 'user.name', 'hablla-codegen[bot]']);
    if (!has('user.email')) git(['config', 'user.email', 'hablla-codegen[bot]@users.noreply.github.com']);
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const report = readReport(args.report);

    // Safety gate: this script only cuts additive releases. Breaking / failure /
    // noop runs must never reach a tag through here.
    if (report.classification !== 'additive' && !args.force) {
        console.error(`[release] classification is "${report.classification}", not "additive" -> refusing to tag (use --force to override).`);
        process.exit(2);
    }

    const bump = decideBump(report.diff);
    const pkgPath = path.join(REPO_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const currentVersion = pkg.version;
    const nextVersion = applyBump(currentVersion, bump);
    const tag = `v${nextVersion}`;

    console.log(`[release] classification : ${report.classification}`);
    console.log(`[release] endpoints       : +${report.diff.addedEndpoints.length} / -${report.diff.removedEndpoints.length} / ~${report.diff.changedSignatures.length}`);
    console.log(`[release] bump            : ${bump}`);
    console.log(`[release] version         : ${currentVersion} -> ${nextVersion}`);
    console.log(`[release] tag             : ${tag}`);

    if (git(['tag', '--list', tag])) {
        throw new Error(`tag ${tag} already exists; refusing to overwrite`);
    }

    // Write the new version with a trailing newline (npm's own format).
    pkg.version = nextVersion;
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

    if (args.dryRun) {
        console.log('[release] --dry-run: package.json bumped locally; no commit/tag/push.');
        return;
    }

    ensureGitIdentity();

    // Recompile the environment bundles from the freshly regenerated resources so
    // the release commit ships them in sync (never a stale isolate/GAS blob).
    rebuildEnvBundles();

    // Stage only the generated + versioned surface, never the report or scratch.
    const stageable = RELEASE_PATHS.filter((p) => fs.existsSync(path.join(REPO_ROOT, p)));
    git(['add', '--', ...stageable]);

    const summary = `chore(codegen): additive regen, release ${tag}`;
    const bodyLines = [
        `Added endpoints: ${report.diff.addedEndpoints.length}`,
        '',
        ...report.diff.addedEndpoints.map((e) => `  + ${e}`),
        '',
        'Automated additive release from the codegen pipeline.',
    ];
    git(['commit', '-m', summary, '-m', bodyLines.join('\n')]);
    git(['tag', '-a', tag, '-m', `${tag} (codegen additive release)`]);
    git(['push', '--follow-tags', 'origin', 'HEAD']);

    console.log(`[release] pushed commit + ${tag}.`);
}

try {
    main();
} catch (error) {
    console.error(`[release] FAILED: ${error.message}`);
    process.exit(1);
}
