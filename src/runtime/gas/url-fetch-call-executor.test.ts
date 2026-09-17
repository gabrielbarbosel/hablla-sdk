import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UrlFetchCallExecutor } from './url-fetch-call-executor';
import type { HttpCall } from '../../sdk/core/call-executor';

/** What the fake answers per URL: a status with a body, or a thrown `fetchAll`. */
type Script = (url: string) => { status: number; body?: string } | 'throw';

let waves: Array<Array<Record<string, any>>>;
let script: Script;

beforeEach(() => {
    waves = [];
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
const OPTIONS = { baseUrl: 'https://api.test', workspaceId: 'ws-1', concurrency: 2 };

/** A GET call to `/v1/items/<name>`. */
function getCall(name: string, strategy: 'workspace' | 'bearer' = 'workspace'): HttpCall {
    return { method: 'GET', rawPath: '/v1/workspaces/{workspace_id}/items/{name}', pathParams: { name }, strategy };
}

describe('UrlFetchCallExecutor', () => {
    it('rejects an invalid concurrency', () => {
        expect(() => new UrlFetchCallExecutor(auth, { ...OPTIONS, concurrency: 0 })).toThrow(RangeError);
    });

    it('sends waves of fetchAll with the pinned header, parsing JSON bodies', async () => {
        const results = await new UrlFetchCallExecutor(auth, OPTIONS).executeAll([getCall('a'), getCall('b', 'bearer'), getCall('c')]);

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
        await new UrlFetchCallExecutor(auth, OPTIONS).executeAll([{ method: 'PUT', rawPath: '/v1/x', body: { a: 1 }, strategy: 'workspace' }]);

        expect(waves[0]![0]).toMatchObject({ method: 'put', contentType: 'application/json', payload: '{"a":1}' });
    });

    it('finishes the wave with a 429 and leaves the next waves unsent', async () => {
        script = (url) => (url.endsWith('/c') ? { status: 429, body: '{"message":"Too many requests"}' } : { status: 201, body: '' });

        const results = await new UrlFetchCallExecutor(auth, OPTIONS).executeAll(['a', 'b', 'c', 'd', 'e'].map((name) => getCall(name)));

        expect(results.map((result) => result.kind)).toEqual(['completed', 'completed', 'throttled', 'completed', 'unsent']);
        expect(results[0]).toEqual({ kind: 'completed', status: 201, data: null });
        expect(waves).toHaveLength(2);
    });

    it('interrupts the wave when fetchAll throws and leaves the rest unsent', async () => {
        script = (url) => (url.endsWith('/a') ? 'throw' : { status: 200, body: 'plain text' });

        const results = await new UrlFetchCallExecutor(auth, OPTIONS).executeAll(['a', 'b', 'c'].map((name) => getCall(name)));

        expect(results).toEqual([
            { kind: 'interrupted', message: 'Address unavailable' },
            { kind: 'interrupted', message: 'Address unavailable' },
            { kind: 'unsent' },
        ]);
    });

    it('keeps a non-JSON body as text', async () => {
        script = () => ({ status: 502, body: '<html>Bad gateway</html>' });

        expect(await new UrlFetchCallExecutor(auth, OPTIONS).executeAll([getCall('a')])).toEqual([{ kind: 'completed', status: 502, data: '<html>Bad gateway</html>' }]);
    });
});
