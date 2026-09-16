/**
 * Generator stage: PROMOTE.
 *
 * Materializes the staged resource tree onto the live `src/sdk/resources`:
 * copies every `_staging/gen_*.ts` over its counterpart and deletes any
 * `gen_*.ts` in the live tree that no longer exists in staging (an endpoint
 * group that was dropped upstream), then replaces `src/sdk/client.ts` with the
 * staged client derived from that same file set. Only `gen_*.ts` files and the
 * client are touched — the hand-written `base.ts` and any non-generated
 * infrastructure are left alone.
 *
 * Promotion is the caller's decision: it runs for every classification EXCEPT
 * `failure`, where the current resources must be preserved untouched.
 */

import * as fs from 'fs';
import * as path from 'path';

import { CLIENT_FILE } from './client';

/** Summary of what {@link promoteResources} changed on disk. */
export interface PromoteResult {
    /** `gen_*.ts` files copied from staging onto the live tree. */
    copied: string[];
    /** `gen_*.ts` files removed from the live tree (gone from staging). */
    removed: string[];
    /** Whether `client.ts` changed on disk. */
    clientUpdated: boolean;
}

/** List `gen_*.ts` basenames in a directory (empty when the dir is absent). */
function listGenFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.startsWith('gen_') && f.endsWith('.ts'));
}

/**
 * Copy the staged tree onto the live resources, prune dropped files and replace the client.
 * @param stagingDir The freshly emitted `_staging` directory (must contain `client.ts`).
 * @param currentDir The live `src/sdk/resources` directory (created if missing).
 * @param clientPath The live `src/sdk/client.ts`.
 * @returns What was copied, removed and whether the client changed.
 */
export function promoteResources(stagingDir: string, currentDir: string, clientPath: string): PromoteResult {
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

    const stagedClient = fs.readFileSync(path.join(stagingDir, CLIENT_FILE), 'utf8');
    const clientUpdated = !fs.existsSync(clientPath) || fs.readFileSync(clientPath, 'utf8') !== stagedClient;
    if (clientUpdated) fs.writeFileSync(clientPath, stagedClient);

    return { copied: copied.sort(), removed: removed.sort(), clientUpdated };
}
