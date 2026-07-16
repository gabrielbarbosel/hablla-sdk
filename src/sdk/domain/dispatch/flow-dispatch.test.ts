import { describe, it, expect, vi, beforeEach } from 'vitest';

const buildXlsxSpy = vi.hoisted(() => vi.fn((_header: string[], _rows: Array<Array<string | number>>) => new Uint8Array([1, 2, 3])));
vi.mock('./xlsx', () => ({ buildXlsx: buildXlsxSpy }));

import { FlowDispatch } from './flow-dispatch';
import type { HabllaClient } from '../../client';
import type { FlowDispatchConfig, FlowDispatchContact } from './types';

interface PostCall {
    path: string;
    opts: { body?: any; strategy?: string };
}

function fakeClient(): { client: HabllaClient; calls: { post: PostCall[] } } {
    const calls = { post: [] as PostCall[] };
    const client = {
        http: {
            post: async (path: string, opts: { body?: unknown; strategy?: string }) => {
                calls.post.push({ path, opts });
                return { id: 'camp-1' };
            },
        },
    } as unknown as HabllaClient;
    return { client, calls };
}

const baseConfig: FlowDispatchConfig = {
    connectionId: 'conn-1',
    templateId: 'tmpl-1',
    sectorId: 'sec-1',
    flowId: 'flow-1',
    name: 'Disparo',
    onAttendance: 'seguir',
    onMissingContact: 'criar',
    templateVarCount: 2,
    variableColumns: ['var1', 'var2'],
    extraColumns: [],
};

const CONFIG_COLUMNS = ['connection', 'template', 'on_atendimento', 'on_sem_cadastro', 'xp_field_id', 'tag', 'sector_id', 'advisors_json', 'var_need', 'finish_reason_id'];

/** Header/rows the domain fed into the (mocked) xlsx builder on the last call. */
function lastMatrix(): { header: string[]; rows: Array<Array<string | number>> } {
    const call = buildXlsxSpy.mock.calls[buildXlsxSpy.mock.calls.length - 1]!;
    return { header: call[0], rows: call[1] };
}

const contacts: FlowDispatchContact[] = [
    { phone: '5551990000001', name: 'Ana', advisorCode: 'adv-a', variables: ['x1', 'x2'] },
    { phone: '5551990000002', name: 'Bruno', advisorCode: 'adv-b', variables: ['y1', 'y2'] },
    { phone: '5551990000003', name: 'Carla', advisorCode: 'adv-c', variables: ['z1', 'z2'] },
];

describe('FlowDispatch.dispatchByFlow', () => {
    beforeEach(() => buildXlsxSpy.mockClear());

    it('posts to campaigns/sheet with an explicit bearer strategy', async () => {
        const { client, calls } = fakeClient();
        await new FlowDispatch(client).dispatchByFlow(contacts, baseConfig);
        expect(calls.post.length).toBe(1);
        expect(calls.post[0]!.path).toBe('/v2/workspaces/{workspace_id}/campaigns/sheet');
        expect(calls.post[0]!.opts.strategy).toBe('bearer');
    });

    it('sends type:flow + flow fields and NO dispatch_config', async () => {
        const { client, calls } = fakeClient();
        await new FlowDispatch(client).dispatchByFlow(contacts, baseConfig);
        const body = calls.post[0]!.opts.body;
        expect(body.kind).toBe('multipart');
        expect(body.fields).toEqual({ name: 'Disparo', type: 'flow', flow: 'flow-1' });
        expect(body.fields).not.toHaveProperty('dispatch_config');
    });

    it('carries the xlsx bytes as the file part named disparo.xlsx', async () => {
        const { client, calls } = fakeClient();
        await new FlowDispatch(client).dispatchByFlow(contacts, baseConfig);
        const file = calls.post[0]!.opts.body.files.file;
        expect(file.data).toBeInstanceOf(Uint8Array);
        expect(file.filename).toBe('disparo.xlsx');
        expect(file.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('builds the header in the exact fixed + variable + extra + config order', async () => {
        const { client } = fakeClient();
        await new FlowDispatch(client).dispatchByFlow(contacts, { ...baseConfig, extraColumns: ['email', 'cf_x'] });
        expect(lastMatrix().header).toEqual(['phone', 'name', 'userId', 'owner_id', 'var1', 'var2', 'email', 'cf_x', ...CONFIG_COLUMNS]);
    });

    it('fixo distribution: every owner_id is owners[0]', async () => {
        const { client } = fakeClient();
        await new FlowDispatch(client).dispatchByFlow(contacts, { ...baseConfig, ownerDistribution: { strategy: 'fixo', owners: ['u-a', 'u-b'] } });
        const ownerCol = lastMatrix().rows.map((row) => row[3]);
        expect(ownerCol).toEqual(['u-a', 'u-a', 'u-a']);
    });

    it('rodizio distribution: owner_id round-robins the pool', async () => {
        const { client } = fakeClient();
        const result = await new FlowDispatch(client).dispatchByFlow(contacts, { ...baseConfig, ownerDistribution: { strategy: 'rodizio', owners: ['u-a', 'u-b'] } });
        const ownerCol = lastMatrix().rows.map((row) => row[3]);
        expect(ownerCol).toEqual(['u-a', 'u-b', 'u-a']);
        expect(result.ownerMap).toEqual({ 'u-a': 2, 'u-b': 1 });
    });

    it('suppresses phones 9th-digit aware and reports the counts', async () => {
        const { client } = fakeClient();
        const result = await new FlowDispatch(client).dispatchByFlow(
            [
                { phone: '5551999596516', name: 'Ana' },   // suppressed (matches given without the 9)
                { phone: '5551990000002', name: 'Bruno' }, // survives
            ],
            { ...baseConfig, suppressPhones: ['555199596516'] },
        );
        expect(result.received).toBe(2);
        expect(result.suppressed).toBe(1);
        expect(result.imported).toBe(1);
    });

    it('all suppressed → imported 0, campaignId undefined, no POST, no throw', async () => {
        const { client, calls } = fakeClient();
        const result = await new FlowDispatch(client).dispatchByFlow(
            [{ phone: '5551990000001', name: 'Ana' }],
            { ...baseConfig, suppressPhones: ['5551990000001'] },
        );
        expect(result.imported).toBe(0);
        expect(result.campaignId).toBeUndefined();
        expect(result.suppressed).toBe(1);
        expect(calls.post.length).toBe(0);
    });

    it('advisorCode fills userId and owner_id stays distinct from it', async () => {
        const { client } = fakeClient();
        await new FlowDispatch(client).dispatchByFlow(contacts, { ...baseConfig, ownerDistribution: { strategy: 'fixo', owners: ['owner-x'] } });
        const first = lastMatrix().rows[0]!;
        expect(first[2]).toBe('adv-a'); // userId
        expect(first[3]).toBe('owner-x'); // owner_id
        expect(first[2]).not.toBe(first[3]);
    });

    it('lays the config values in the right positions (defaults applied)', async () => {
        const { client } = fakeClient();
        await new FlowDispatch(client).dispatchByFlow(contacts, baseConfig);
        const first = lastMatrix().rows[0]!;
        // after phone,name,userId,owner_id (4) + var1,var2 (2) = index 6 starts config
        expect(first.slice(6)).toEqual(['conn-1', 'tmpl-1', 'seguir', 'criar', '', '', 'sec-1', '{}', '2', '']);
    });

    it('returns the full result shape', async () => {
        const { client } = fakeClient();
        const result = await new FlowDispatch(client).dispatchByFlow(contacts, { ...baseConfig, ownerDistribution: { strategy: 'fixo', owners: ['u-a'] } });
        expect(result).toEqual({ campaignId: 'camp-1', imported: 3, received: 3, suppressed: 0, ownerMap: { 'u-a': 3 } });
    });

    it('rejects when a required id is missing', async () => {
        const { client } = fakeClient();
        await expect(new FlowDispatch(client).dispatchByFlow(contacts, { ...baseConfig, sectorId: '' })).rejects.toThrow(/sectorId/);
    });
});
