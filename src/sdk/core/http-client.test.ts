import { describe, it, expect } from 'vitest';
import { HabllaHttpClient } from './http-client';
import type { HabllaAuth } from './auth';
import type { HttpTransport, HttpResponse } from './types';

interface SendRecord {
    method: string;
    url: string;
    authorization?: string;
}

function fakeAuth(): { auth: HabllaAuth; recorded: Array<{ key: string; strategy: string }> } {
    const recorded: Array<{ key: string; strategy: string }> = [];
    const auth = {
        authorization: async (strategy: string) => (strategy === 'bearer' ? 'Bearer TOK' : 'WS-TOK'),
        resolveStrategy: async (_key: string) => 'workspace',
        recordStrategy: async (key: string, strategy: string) => { recorded.push({ key, strategy }); },
    } as unknown as HabllaAuth;
    return { auth, recorded };
}

function fakeTransport(statuses: number[]): { transport: HttpTransport; sends: SendRecord[] } {
    const sends: SendRecord[] = [];
    let index = 0;
    const transport: HttpTransport = {
        async send<T>(req: { method: string; url: string; headers?: Record<string, string> }): Promise<HttpResponse<T>> {
            sends.push({ method: req.method, url: req.url, authorization: req.headers?.Authorization });
            const status = statuses[Math.min(index, statuses.length - 1)] ?? 200;
            index++;
            return { status, headers: {}, data: { ok: true } as unknown as T };
        },
    };
    return { transport, sends };
}

function makeClient(statuses: number[]) {
    const { auth, recorded } = fakeAuth();
    const { transport, sends } = fakeTransport(statuses);
    const client = new HabllaHttpClient(transport, auth, { workspaceId: 'ws', baseUrl: 'https://api.test' });
    return { client, sends, recorded };
}

describe('HabllaHttpClient opts.strategy override', () => {
    it('forces Bearer on the first (and only) send', async () => {
        const { client, sends, recorded } = makeClient([200]);
        await client.post('/v2/x', { strategy: 'bearer' });
        expect(sends.length).toBe(1);
        expect(sends[0]!.authorization).toBe('Bearer TOK');
        expect(recorded.length).toBe(0);
    });

    it('does NOT fall back on a 500 (single send, cache untouched)', async () => {
        const { client, sends, recorded } = makeClient([500]);
        await expect(client.post('/v2/x', { strategy: 'bearer' })).rejects.toBeTruthy();
        expect(sends.length).toBe(1);
        expect(recorded.length).toBe(0);
    });

    it('does NOT probe/fall back on a 401 (single send)', async () => {
        const { client, sends, recorded } = makeClient([401]);
        await expect(client.post('/v2/x', { strategy: 'bearer' })).rejects.toBeTruthy();
        expect(sends.length).toBe(1);
        expect(recorded.length).toBe(0);
    });
});

describe('HabllaHttpClient default auth (regression, no opts.strategy)', () => {
    it('workspace-first then falls back to Bearer on 401 and records it', async () => {
        const { client, sends, recorded } = makeClient([401, 200]);
        await client.get('/v2/y');
        expect(sends.length).toBe(2);
        expect(sends[0]!.authorization).toBe('WS-TOK');
        expect(sends[1]!.authorization).toBe('Bearer TOK');
        expect(recorded).toEqual([{ key: 'GET:/v2/y', strategy: 'bearer' }]);
    });

    it('records workspace on a clean 200', async () => {
        const { client, sends, recorded } = makeClient([200]);
        await client.get('/v2/z');
        expect(sends.length).toBe(1);
        expect(sends[0]!.authorization).toBe('WS-TOK');
        expect(recorded).toEqual([{ key: 'GET:/v2/z', strategy: 'workspace' }]);
    });
});
