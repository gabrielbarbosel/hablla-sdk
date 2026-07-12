/**
 * Generator stage: PROMOTE.
 *
 * Materializes the staged resource tree onto the live `src/sdk/resources`:
 * copies every `_staging/gen_*.ts` over its counterpart and deletes any
 * `gen_*.ts` in the live tree that no longer exists in staging (an endpoint
 * group that was dropped upstream). Only `gen_*.ts` files are touched — the
 * hand-written `base.ts` and any non-generated infrastructure are left alone.
 *
 * Promotion is the caller's decision: it runs for every classification EXCEPT
 * `failure`, where the current resources must be preserved untouched.
 */

import * as fs from 'fs';
import * as path from 'path';

/** Summary of what {@link promoteResources} changed on disk. */
export interface PromoteResult {
    /** `gen_*.ts` files copied from staging onto the live tree. */
    copied: string[];
    /** `gen_*.ts` files removed from the live tree (gone from staging). */
    removed: string[];
}

/** List `gen_*.ts` basenames in a directory (empty when the dir is absent). */
function listGenFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.startsWith('gen_') && f.endsWith('.ts'));
}

/**
 * Copy the staged tree onto the live resources and prune dropped files.
 * @param stagingDir The freshly emitted `_staging` directory.
 * @param currentDir The live `src/sdk/resources` directory (created if missing).
 * @returns What was copied and removed.
 */
export function promoteResources(stagingDir: string, currentDir: string): PromoteResult {
    fs.mkdirSync(currentDir, { recursive: true });
    const stagingFiles = listGenFiles(stagingDir);
    const currentFiles = listGenFiles(currentDir);
    const stagingSet = new Set(stagingFiles);

    const copied: string[] = [];
    for (const file of stagingFiles) {
        fs.copyFileSync(path.join(stagingDir, file), path.join(currentDir, file));
        copied.push(file);
    }

    const removed: string[] = [];
    for (const file of currentFiles) {
        if (stagingSet.has(file)) continue;
        fs.rmSync(path.join(currentDir, file));
        removed.push(file);
    }

    return { copied: copied.sort(), removed: removed.sort() };
}
