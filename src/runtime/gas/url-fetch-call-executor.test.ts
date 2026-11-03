import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UrlFetchCallExecutor } from './url-fetch-call-executor';
import type { HttpCall } from '../../sdk/core/call-executor';

/** What the fake answers per URL: a status with a body, or a thrown `fetchAll`. */
type Script = (url: string) => { status: number; body?: string } | 'throw';

let waves: Array<Array<Record<string, any>>>;
let script: Script;
let pauses: Array<{ ms: number; afterWave: number }>;

beforeEach(() => {
    waves = [];
    pauses = [];
    script = () => ({ status: 200, body: '{"ok":true}' });
    (globalThis as any).UrlFetchApp = {
        fetchAll(requests: Array<Record<string, any>>) {
            waves.push(requests);
            const replies = requests.map((request) => script(request.url));

            if (replies.includes('throw')) {
                throw new Error('Address unavailable');
            }

            return replies.map((reply) => {
                const { status, body } = reply as { status: number; body?: string };
                return { getResponseCode: () => status, getContentText: () => body ?? '' };
            });
        },
    };
});

afterEach(() => {
    delete (globalThis as any).UrlFetchApp;
});

const auth = { authorization: async (strategy: string) => (strategy === 'bearer' ? 'Bearer TOKEN' : 'WORKSPACE-TOKEN') };
const OPTIONS = {
    baseUrl: 'https://api.test',
    workspaceId: 'ws-1',
    pause: async (ms: number) => {
        pauses.push({ ms, afterWave: waves.length });
    },
};
const PACING = { concurrency: 2, pauseMs: 0 };

/** A GET call to `/v1/items/<name>`. */
function getCall(name: string, strategy: 'workspace' | 'bearer' = 'workspace'): HttpCall {
    return { method: 'GET', rawPath: '/v1/workspaces/{workspace_id}/items/{name}', pathParams: { name }, strategy };
}

describe('UrlFetchCallExecutor', () => {
    it('rejects an invalid pacing before any fetchAll', async () => {
        await expect(new UrlFetchCallExecutor(auth, OPTIONS).executeAll([getCall('a')], { concurrency: 0, pauseMs: 0 })).rejects.toBeInstanceOf(RangeError);
        await expect(new UrlFetchCallExecutor(auth, OPTIONS).executeAll([getCall('a')], { concurrency: 2, pauseMs: -1 })).rejects.toBeInstanceOf(RangeError);
        expect(waves).toHaveLength(0);
    });

    it('pauses between two fetchAll waves and never after the last one', async () => {
        await new UrlFetchCallExecutor(auth, OPTIONS).executeAll(['a', 'b', 'c', 'd', 'e'].map((name) => getCall(name)), { concurrency: 2, pauseMs: 250 });

        expect(waves.map((wave) => wave.length)).toEqual([2, 2, 1]);
        expect(pauses).toEqual([{ ms: 250, afterWave: 1 }, { ms: 250, afterWave: 2 }]);
    });

    it('sends waves of fetchAll with the pinned header, parsing JSON bodies', async () => {
        const results = await new UrlFetchCallExecutor(auth, OPTIONS).executeAll([getCall('a'), getCall('b', 'bearer'), getCall('c')], PACING);

        expect(waves.map((wave) => wave.length)).toEqual([2, 1]);
        expect(waves[0]![0]).toEqual({ url: 'https://api.test/v1/workspaces/ws-1/items/a', method: 'get', headers: { Accept: 'application/json', Authorization: 'WORKSPACE-TOKEN' }, muteHttpExceptions: true });
        expect(waves[0]![1]!.headers.Authorization).toBe('Bearer TOKEN');
        expect(results).toEqual([
            { kind: 'completed', status: 200, data: { ok: true } },
            { kind: 'completed', status: 200, data: { ok: true } },
            { kind: 'completed', status: 200, data: { ok: true } },
        ]);
    });

    it('serializes a body as JSON', async () => {
        await new UrlFetchCallExecutor(auth, OPTIONS).executeAll([{ method: 'PUT', rawPath: '/v1/x', body: { a: 1 }, strategy: 'workspace' }], PACING);

        expect(waves[0]![0]).toMatchObject({ method: 'put', contentType: 'application/json', payload: '{"a":1}' });
    });

    it('finishes the wave with a 429 and leaves the next waves unsent', async () => {
        script = (url) => (url.endsWith('/c') ? { status: 429, body: '{"message":"Too many requests"}' } : { status: 201, body: '' });

        const results = await new UrlFetchCallExecutor(auth, OPTIONS).executeAll(['a', 'b', 'c', 'd', 'e'].map((name) => getCall(name)), PACING);

        expect(results.map((result) => result.kind)).toEqual(['completed', 'completed', 'throttled', 'completed', 'unsent']);
        expect(results[0]).toEqual({ kind: 'completed', status: 201, data: null });
        expect(waves).toHaveLength(2);
    });

    it('interrupts the wave when fetchAll throws and leaves the rest unsent', async () => {
        script = (url) => (url.endsWith('/a') ? 'throw' : { status: 200, body: 'plain text' });

        const results = await new UrlFetchCallExecutor(auth, OPTIONS).executeAll(['a', 'b', 'c'].map((name) => getCall(name)), PACING);

        expect(results).toEqual([
            { kind: 'interrupted', message: 'Address unavailable' },
            { kind: 'interrupted', message: 'Address unavailable' },
            { kind: 'unsent' },
        ]);
    });

    it('keeps a non-JSON body as text', async () => {
        script = () => ({ status: 502, body: '<html>Bad gateway</html>' });

        expect(await new UrlFetchCallExecutor(auth, OPTIONS).executeAll([getCall('a')], PACING)).toEqual([{ kind: 'completed', status: 502, data: '<html>Bad gateway</html>' }]);
    });
});
