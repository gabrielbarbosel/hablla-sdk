import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FileStrategyCache } from './file-strategy-cache';
import type { AuthStrategy } from '../../sdk/core/strategy';

const seed: Record<string, AuthStrategy> = {
    'POST:/v1/workspaces/{workspace_id}/segmentations': 'bearer',
    'POST:/v1/workspaces/{workspace_id}/import': 'bearer',
};

function tmpFile(): string {
    return path.join(os.tmpdir(), `hablla-strategy-test-${process.pid}-${Math.floor(process.hrtime()[1])}.json`);
}

describe('FileStrategyCache seed floor', () => {
    const files: string[] = [];
    afterEach(() => {
        for (const f of files.splice(0)) { try { fs.unlinkSync(f); } catch { } }
    });

    it('returns the seed when no file exists yet', async () => {
        const file = tmpFile();
        files.push(file);
        const cache = new FileStrategyCache(file, seed);
        expect(await cache.load()).toEqual(seed);
    });

    it('lets persisted values override the seed (a learned correction wins)', async () => {
        const file = tmpFile();
        files.push(file);
        const cache = new FileStrategyCache(file, seed);
        await cache.save({ 'POST:/v1/workspaces/{workspace_id}/segmentations': 'workspace', 'GET:/v1/foo': 'workspace' });
        const loaded = await cache.load();
        expect(loaded['POST:/v1/workspaces/{workspace_id}/segmentations']).toBe('workspace');
        expect(loaded['POST:/v1/workspaces/{workspace_id}/import']).toBe('bearer');
        expect(loaded['GET:/v1/foo']).toBe('workspace');
    });

    it('defaults to an empty seed (backward compatible)', async () => {
        const file = tmpFile();
        files.push(file);
        expect(await new FileStrategyCache(file).load()).toEqual({});
    });
});
