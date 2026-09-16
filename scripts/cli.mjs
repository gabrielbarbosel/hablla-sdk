/**
 * Shared CLI plumbing for the codegen scripts: entry-point detection (so the
 * pure functions stay importable by tests) and `--key=value` flag parsing.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root, one level above `scripts/`. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Whether the module at `moduleUrl` is the script node was started with.
 * Compares real paths so 8.3 short names and symlinks on Windows still match.
 * @param {string} moduleUrl The caller's `import.meta.url`.
 * @returns {boolean}
 */
export function isEntryPoint(moduleUrl) {
    if (!process.argv[1]) return false;
    return fs.realpathSync(fileURLToPath(moduleUrl)) === fs.realpathSync(path.resolve(process.argv[1]));
}

/**
 * Parse `<command> --key=value…` arguments, failing on anything else.
 * @param {string[]} argv Arguments after the script path.
 * @param {string[]} allowedFlags Flag names the command accepts.
 * @returns {{ command: string | undefined, flags: Record<string, string> }}
 */
export function parseCommandLine(argv, allowedFlags) {
    const [command, ...rest] = argv;
    const flags = {};
    for (const raw of rest) {
        const match = /^--([a-z-]+)=(.*)$/s.exec(raw);
        if (!match || !allowedFlags.includes(match[1])) throw new Error(`unknown argument: ${raw}`);
        flags[match[1]] = match[2];
    }
    return { command, flags };
}

/**
 * Read `generation-report.json`, or `null` when the pipeline never wrote one.
 * @param {string} reportPath Path to the report.
 * @returns {object | null}
 */
export function readReportIfPresent(reportPath) {
    return fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
}
