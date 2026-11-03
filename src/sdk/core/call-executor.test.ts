import { describe, it, expect } from 'vitest';
import { TransportCallExecutor, wavePausesMs, type HttpCall, type WavePause } from './call-executor';
import type { HttpRequest, HttpResponse, HttpTransport } from './types';
import type { AuthStrategy } from './strategy';

/** What the fake transport answers for one request: a status, or a rejection. */
type ScriptedReply = { status: number; data?: unknown } | { reject: string };

/** Transport that answers by URL substring and records every request and wave overlap. */
class ScriptedTransport implements HttpTransport {
    readonly requests: HttpRequest[] = [];
    maxInFlight = 0;
    private inFlight = 0;

    constructor(private readonly script: (url: string) => ScriptedReply) {}

    async send<T>(request: HttpRequest): Promise<HttpResponse<T>> {
        this.requests.push(request);
        this.inFlight++;
        this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
        await Promise.resolve();
        this.inFlight--;

        const reply = this.script(request.url);

        if ('reject' in reply) {
            throw new Error(reply.reject);
        }

        return { status: reply.status, headers: {}, data: (reply.data ?? { url: request.url }) as T };
    }
}

/** Auth double that counts header resolutions per strategy. */
function countingAuth(): { auth: { authorization(strategy: AuthStrategy): Promise<string> }; resolutions: AuthStrategy[] } {
    const resolutions: AuthStrategy[] = [];
    const auth = {
        async authorization(strategy: AuthStrategy): Promise<string> {
            resolutions.push(strategy);
            return strategy === 'bearer' ? 'Bearer TOKEN' : 'WORKSPACE-TOKEN';
        },
    };
    return { auth, resolutions };
}

/** A pause double that records each wait and how many requests were sent before it. */
function recordingPause(transport: ScriptedTransport): { pause: WavePause; pauses: Array<{ ms: number; afterRequests: number }> } {
    const pauses: Array<{ ms: number; afterRequests: number }> = [];
    const pause: WavePause = async (ms) => {
        pauses.push({ ms, afterRequests: transport.requests.length });
    };
    return { pause, pauses };
}

const OPTIONS = { baseUrl: 'https://api.test', workspaceId: 'ws-1', pause: async () => undefined };
const PACING = { concurrency: 2, pauseMs: 0 };

/** A GET call to `/v1/items/<name>` on the given strategy. */
function getCall(name: string, strategy: AuthStrategy = 'workspace'): HttpCall {
    return { method: 'GET', rawPath: '/v1/workspaces/{workspace_id}/items/{name}', pathParams: { name }, strategy };
}

describe('TransportCallExecutor', () => {
    it('rejects a pacing whose concurrency is not an integer >= 1 or whose pause is not an integer >= 0, sending nothing', async () => {
        const { auth } = countingAuth();
        const transport = new ScriptedTransport(() => ({ status: 200 }));
        const executor = new TransportCallExecutor(transport, auth, OPTIONS);

        await expect(executor.executeAll([getCall('a')], { concurrency: 0, pauseMs: 0 })).rejects.toBeInstanceOf(RangeError);
        await expect(executor.executeAll([getCall('a')], { concurrency: 1.5, pauseMs: 0 })).rejects.toBeInstanceOf(RangeError);
        await expect(executor.executeAll([getCall('a')], { concurrency: 2, pauseMs: 0.5 })).rejects.toBeInstanceOf(RangeError);
        await expect(executor.executeAll([getCall('a')], { concurrency: 2, pauseMs: -1 })).rejects.toBeInstanceOf(RangeError);
        expect(transport.requests).toHaveLength(0);
    });

    it('pauses between two consecutive waves and never after the last one', async () => {
        const { auth } = countingAuth();
        const transport = new ScriptedTransport(() => ({ status: 200 }));
        const { pause, pauses } = recordingPause(transport);

        await new TransportCallExecutor(transport, auth, { ...OPTIONS, pause }).executeAll(['a', 'b', 'c', 'd', 'e'].map((name) => getCall(name)), { concurrency: 2, pauseMs: 250 });

        expect(pauses).toEqual([{ ms: 250, afterRequests: 2 }, { ms: 250, afterRequests: 4 }]);
    });

    it('never pauses a single wave, a zero pause, or after a wave that stopped the batch', async () => {
        const { auth } = countingAuth();
        const transport = new ScriptedTransport((url) => (url.endsWith('/b') ? { status: 429 } : { status: 200 }));
        const { pause, pauses } = recordingPause(transport);
        const executor = new TransportCallExecutor(transport, auth, { ...OPTIONS, pause });

        await executor.executeAll([getCall('x'), getCall('y')], { concurrency: 2, pauseMs: 250 });
        await executor.executeAll(['x', 'y', 'z'].map((name) => getCall(name)), { concurrency: 1, pauseMs: 0 });
        await executor.executeAll(['a', 'b', 'c', 'd'].map((name) => getCall(name)), { concurrency: 2, pauseMs: 250 });

        expect(pauses).toEqual([]);
    });

    it('runs waves no larger than the concurrency and aligns results with calls', async () => {
        const { auth } = countingAuth();
        const transport = new ScriptedTransport((url) => ({ status: 200, data: { url } }));
        const executor = new TransportCallExecutor(transport, auth, OPTIONS);

        const results = await executor.executeAll(['a', 'b', 'c', 'd', 'e'].map((name) => getCall(name)), PACING);

        expect(transport.maxInFlight).toBe(2);
        expect(results.map((result) => result.kind === 'completed' && (result.data as { url: string }).url)).toEqual(
            ['a', 'b', 'c', 'd', 'e'].map((name) => `https://api.test/v1/workspaces/ws-1/items/${name}`),
        );
    });

    it('finishes the wave holding a 429 and reports the later waves as unsent', async () => {
        const { auth } = countingAuth();
        const transport = new ScriptedTransport((url) => (url.endsWith('/c') ? { status: 429 } : { status: 200 }));
        const executor = new TransportCallExecutor(transport, auth, OPTIONS);

        const results = await executor.executeAll(['a', 'b', 'c', 'd', 'e', 'f'].map((name) => getCall(name)), PACING);

        expect(results.map((result) => result.kind)).toEqual(['completed', 'completed', 'throttled', 'completed', 'unsent', 'unsent']);
        expect(transport.requests).toHaveLength(4);
    });

    it('marks a single rejected send as transportFailed and keeps going', async () => {
        const { auth } = countingAuth();
        const transport = new ScriptedTransport((url) => (url.endsWith('/b') ? { reject: 'socket hang up' } : { status: 500 }));
        const executor = new TransportCallExecutor(transport, auth, OPTIONS);

        const results = await executor.executeAll(['a', 'b', 'c'].map((name) => getCall(name)), PACING);

        expect(results).toEqual([
            { kind: 'completed', status: 500, data: { url: 'https://api.test/v1/workspaces/ws-1/items/a' } },
            { kind: 'transportFailed', message: 'socket hang up' },
            { kind: 'completed', status: 500, data: { url: 'https://api.test/v1/workspaces/ws-1/items/c' } },
        ]);
    });

    it('marks a wave whose sends all rejected as interrupted and the rest as unsent', async () => {
        const { auth } = countingAuth();
        const transport = new ScriptedTransport((url) => (url.endsWith('/c') || url.endsWith('/d') ? { reject: 'network down' } : { status: 201 }));
        const executor = new TransportCallExecutor(transport, auth, OPTIONS);

        const results = await executor.executeAll(['a', 'b', 'c', 'd', 'e'].map((name) => getCall(name)), PACING);

        expect(results.map((result) => result.kind)).toEqual(['completed', 'completed', 'interrupted', 'interrupted', 'unsent']);
        expect(results[2]).toEqual({ kind: 'interrupted', message: 'network down' });
    });

    it('sends each call with its pinned strategy header, resolving each strategy once', async () => {
        const { auth, resolutions } = countingAuth();
        const transport = new ScriptedTransport(() => ({ status: 200 }));
        const executor = new TransportCallExecutor(transport, auth, OPTIONS);

        await executor.executeAll([getCall('a'), getCall('b', 'bearer'), getCall('c'), getCall('d', 'bearer')], PACING);

        expect(transport.requests.map((request) => request.headers?.Authorization)).toEqual(['WORKSPACE-TOKEN', 'Bearer TOKEN', 'WORKSPACE-TOKEN', 'Bearer TOKEN']);
        expect(resolutions).toEqual(['workspace', 'bearer']);
    });

    it('never resolves the bearer token for a workspace-only batch', async () => {
        const { auth, resolutions } = countingAuth();
        const executor = new TransportCallExecutor(new ScriptedTransport(() => ({ status: 200 })), auth, OPTIONS);

        await executor.executeAll([getCall('a'), getCall('b')], PACING);

        expect(resolutions).toEqual(['workspace']);
    });

    it('serializes the query and sends a JSON body with its content type', async () => {
        const { auth } = countingAuth();
        const transport = new ScriptedTransport(() => ({ status: 201 }));
        const executor = new TransportCallExecutor(transport, auth, OPTIONS);

        await executor.executeAll([
            { method: 'POST', rawPath: '/v1/workspaces/{workspace_id}/persons', query: { limit: 50 }, body: { name: 'ANA' }, strategy: 'workspace' },
        ], PACING);

        expect(transport.requests[0]).toMatchObject({
            method: 'POST',
            url: 'https://api.test/v1/workspaces/ws-1/persons?limit=50',
            body: { name: 'ANA' },
            headers: { 'Content-Type': 'application/json' },
        });
    });

    it('returns no results and sends nothing for an empty batch', async () => {
        const { auth, resolutions } = countingAuth();
        const transport = new ScriptedTransport(() => ({ status: 200 }));

        expect(await new TransportCallExecutor(transport, auth, OPTIONS).executeAll([], PACING)).toEqual([]);
        expect(transport.requests).toHaveLength(0);
        expect(resolutions).toHaveLength(0);
    });
});

describe('wavePausesMs', () => {
    it('counts one pause between each two waves of a batch that runs to the end', () => {
        expect(wavePausesMs(0, { concurrency: 8, pauseMs: 250 })).toBe(0);
        expect(wavePausesMs(8, { concurrency: 8, pauseMs: 250 })).toBe(0);
        expect(wavePausesMs(9, { concurrency: 8, pauseMs: 250 })).toBe(250);
        expect(wavePausesMs(100, { concurrency: 8, pauseMs: 250 })).toBe(12 * 250);
        expect(wavePausesMs(100, { concurrency: 8, pauseMs: 0 })).toBe(0);
    });
});
