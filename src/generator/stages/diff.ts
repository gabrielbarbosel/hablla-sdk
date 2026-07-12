/**
 * Generator stage: DIFF + CLASSIFY.
 *
 * Compares the freshly emitted `_staging` resource files against the live
 * `src/sdk/resources` and reduces the delta to the shape the release driver
 * (`scripts/release.mjs`) and the report consume:
 *
 *   { addedEndpoints, removedEndpoints, changedSignatures, addedFiles, changedFiles }
 *
 * An "endpoint" is the `VERB /path` a method is annotated with (`@method GET
 * /v2/...`), and its "signature" is the emitted method declaration line
 * (`name(args): Promise<T>`). Both are read straight out of the `.ts` source —
 * no TypeScript program needed — so the diff is a pure function of the two file
 * trees and re-running on the same trees yields the same result.
 *
 * The classification is then a deterministic function of the guard verdict and
 * this diff: `failure` (a guard tripped) > `breaking` (an endpoint vanished or a
 * signature changed) > `additive` (only new endpoints/files) > `noop`.
 */

import * as fs from 'fs';
import * as path from 'path';

import { GuardResult } from './guard';

/** One method's identity: its `VERB /path` key and its declaration signature. */
export interface EndpointSignature {
    /** `VERB /path`, e.g. `GET /v2/workspaces/{workspace_id}/cards`. */
    key: string;
    /** The emitted declaration line, e.g. `listCards(opts: {...}): Promise<Paged<Card>>`. */
    signature: string;
}

/** A signature that changed between the current tree and the staged tree. */
export interface ChangedSignature {
    endpoint: string;
    before: string;
    after: string;
}

/** The endpoint/file delta between two resource trees. */
export interface ResourceDiff {
    addedEndpoints: string[];
    removedEndpoints: string[];
    changedSignatures: ChangedSignature[];
    addedFiles: string[];
    changedFiles: string[];
}

/** The four release classifications, in descending severity. */
export type Classification = 'failure' | 'breaking' | 'additive' | 'noop';

/**
 * Parse every `@method VERB /path` annotation in a resource file and pair it
 * with the method declaration line that follows its JSDoc block.
 * @param source The `.ts` source of one resource file.
 * @returns One entry per annotated method (endpoint key + signature).
 */
export function parseEndpointSignatures(source: string): EndpointSignature[] {
    // Split on either line ending so CRLF (Windows checkout) vs LF (Linux CI) never
    // shows up as a phantom signature change.
    const lines = source.split(/\r?\n/);
    const out: EndpointSignature[] = [];
    for (let i = 0; i < lines.length; i++) {
        const tag = /@method\s+(\w+)\s+(\S+)/.exec(lines[i]!);
        if (!tag) continue;
        const key = `${tag[1]!.toUpperCase()} ${tag[2]}`;
        // Walk forward past the rest of the JSDoc block (`*`/blank lines) to the
        // first real code line: the method declaration.
        let signature = '';
        for (let j = i + 1; j < lines.length; j++) {
            const trimmed = lines[j]!.trim();
            if (trimmed === '' || trimmed.startsWith('*') || trimmed.startsWith('/**')) continue;
            const decl = /^([A-Za-z0-9_]+)\s*\(.*\)\s*:\s*Promise<.*>/.exec(trimmed);
            if (decl) signature = trimmed.replace(/\s*\{?\s*$/, '');
            break;
        }
        out.push({ key, signature });
    }
    return out;
}

/** List the `gen_*.ts` basenames present in a directory (empty if absent). */
function listGenFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.startsWith('gen_') && f.endsWith('.ts')).sort();
}

/** Build a map of endpoint key -> signature across every `gen_*.ts` in a tree. */
function endpointMap(dir: string, files: string[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const file of files) {
        const source = fs.readFileSync(path.join(dir, file), 'utf8');
        for (const { key, signature } of parseEndpointSignatures(source)) {
            map.set(key, signature);
        }
    }
    return map;
}

/**
 * Diff the staged resource tree against the current one.
 * @param stagingDir The freshly emitted `_staging` directory.
 * @param currentDir The live `src/sdk/resources` directory.
 * @returns The endpoint/file delta.
 */
export function diffResources(stagingDir: string, currentDir: string): ResourceDiff {
    const stagingFiles = listGenFiles(stagingDir);
    const currentFiles = listGenFiles(currentDir);

    const stagingEndpoints = endpointMap(stagingDir, stagingFiles);
    const currentEndpoints = endpointMap(currentDir, currentFiles);

    const addedEndpoints: string[] = [];
    const changedSignatures: ChangedSignature[] = [];
    for (const [key, after] of stagingEndpoints) {
        if (!currentEndpoints.has(key)) {
            addedEndpoints.push(key);
        } else {
            const before = currentEndpoints.get(key)!;
            if (before !== after) changedSignatures.push({ endpoint: key, before, after });
        }
    }
    const removedEndpoints: string[] = [];
    for (const key of currentEndpoints.keys()) {
        if (!stagingEndpoints.has(key)) removedEndpoints.push(key);
    }

    const currentSet = new Set(currentFiles);
    const addedFiles = stagingFiles.filter((f) => !currentSet.has(f));
    const changedFiles: string[] = [];
    for (const file of stagingFiles) {
        if (!currentSet.has(file)) continue;
        // Normalize line endings before comparing so CRLF vs LF is not a diff.
        const a = fs.readFileSync(path.join(stagingDir, file), 'utf8').replace(/\r\n/g, '\n');
        const b = fs.readFileSync(path.join(currentDir, file), 'utf8').replace(/\r\n/g, '\n');
        if (a !== b) changedFiles.push(file);
    }

    return {
        addedEndpoints: addedEndpoints.sort(),
        removedEndpoints: removedEndpoints.sort(),
        changedSignatures: changedSignatures.sort((x, y) => (x.endpoint < y.endpoint ? -1 : 1)),
        addedFiles: addedFiles.sort(),
        changedFiles: changedFiles.sort(),
    };
}

/**
 * Classify a run from the guard verdict and the diff. Severity order:
 * `failure` (a guard tripped) > `breaking` (removed endpoint or changed
 * signature) > `additive` (only new endpoints/files) > `noop`.
 * @param guards The guard verdict.
 * @param diff The resource diff.
 */
export function classify(guards: GuardResult, diff: ResourceDiff): Classification {
    if (!guards.ok) return 'failure';
    if (diff.removedEndpoints.length > 0 || diff.changedSignatures.length > 0) return 'breaking';
    if (diff.addedEndpoints.length > 0 || diff.addedFiles.length > 0) return 'additive';
    return 'noop';
}

/**
 * The percentage of current endpoints that disappeared in the staged tree.
 * Surfaced as `guards.endpointDropPct` — a durability signal (a big drop is a
 * red flag even when the guards technically pass).
 * @param diff The resource diff.
 * @param currentEndpointCount Total endpoints in the current tree.
 */
export function endpointDropPct(diff: ResourceDiff, currentEndpointCount: number): number {
    if (currentEndpointCount <= 0) return 0;
    return Math.round((diff.removedEndpoints.length / currentEndpointCount) * 1000) / 10;
}

/** Count the endpoints in a resource tree (for {@link endpointDropPct}). */
export function countEndpoints(dir: string): number {
    return endpointMap(dir, listGenFiles(dir)).size;
}
