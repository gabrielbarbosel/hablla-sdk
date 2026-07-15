import { describe, it, expect } from 'vitest';
import { MassDispatch } from './mass-dispatch';
import type { HabllaClient } from '../../client';
import type { MassDispatchLedgerEntry, MassDispatchSpec } from './types';

interface Calls {
    createSegmentation: unknown[];
    createImport: Array<{ fields: Record<string, string> }>;
    createCampaign: unknown[];
    servicesBatch: unknown[];
    listServices: unknown[];
}

interface OpenService {
    id: string;
    status: string;
    phone: string;
}

function fakeClient(counterSequence: number[], openServices: OpenService[] = []): { client: HabllaClient; calls: Calls } {
    const calls: Calls = { createSegmentation: [], createImport: [], createCampaign: [], servicesBatch: [], listServices: [] };
    let counterIndex = 0;
    const client = {
        segmentations: {
            createSegmentation: async (body: unknown) => {
                calls.createSegmentation.push(body);
                return { id: 'seg-1' };
            },
            getSegmentation: async () => {
                const value = counterSequence[Math.min(counterIndex, counterSequence.length - 1)] ?? 0;
                counterIndex++;
                return { counter: value };
            },
        },
        import: {
            createImport: async (_file: unknown, fields: Record<string, string>) => {
                calls.createImport.push({ fields });
                return { message: 'successfully received' };
            },
        },
        campaigns: {
            createCampaign: async (body: unknown) => {
                calls.createCampaign.push(body);
                return { id: 'camp-1' };
            },
        },
        services: {
            batch: async (body: unknown) => {
                calls.servicesBatch.push(body);
                return { ok: true };
            },
            listServices: async (opts: { query: { page?: string } }) => {
                calls.listServices.push(opts);
                const page = Number(opts.query.page ?? '1');
                const results = page === 1
                    ? openServices.map((s) => ({ id: s.id, status: s.status, person: { id: 'p-' + s.id, phones: [{ phone: s.phone }] } }))
                    : [];
                return { results, totalItems: openServices.length };
            },
        },
    } as unknown as HabllaClient;
    return { client, calls };
}

const noSleep = async () => {};
const baseSpec: MassDispatchSpec = { connectionId: 'conn-1', templateId: 'tmpl-1', owner: { mode: 'single', userId: 'user-A' } };

describe('MassDispatch.run', () => {
    it('single owner: one import, one campaign, ledger recorded', async () => {
        const { client, calls } = fakeClient([2]);
        const recorded: MassDispatchLedgerEntry[] = [];
        const md = new MassDispatch(client, { record: async (e) => { recorded.push(e); } });

        const result = await md.run(
            [{ name: 'A', phone: '5551990000001' }, { name: 'B', phone: '5551990000002' }],
            baseSpec,
            noSleep,
        );

        expect(calls.createImport.length).toBe(1);
        expect(JSON.parse(calls.createImport[0]!.fields.data!).user).toBe('user-A');
        expect(calls.createCampaign.length).toBe(1);
        expect(result.status).toBe('sent');
        expect(result.campaignId).toBe('camp-1');
        expect(result.audienceCount).toBe(2);
        expect(recorded.length).toBe(1);
        expect(recorded[0]!.segmentationId).toBe('seg-1');
        expect(recorded[0]!.ownerMap).toEqual({ 'user-A': 2 });
    });

    it('perContact: one import per owner group', async () => {
        const { client, calls } = fakeClient([3]);
        const md = new MassDispatch(client);
        const result = await md.run(
            [
                { name: 'A', phone: '5551990000001', owner: 'user-A' },
                { name: 'B', phone: '5551990000002', owner: 'user-B' },
                { name: 'C', phone: '5551990000003', owner: 'user-A' },
            ],
            { ...baseSpec, owner: { mode: 'perContact' } },
            noSleep,
        );
        expect(calls.createImport.length).toBe(2);
        expect(result.ownerMap).toEqual({ 'user-A': 2, 'user-B': 1 });
    });

    it('campaign body targets the batch segmentation and stays flow-less', async () => {
        const { client, calls } = fakeClient([1]);
        const md = new MassDispatch(client);
        await md.run([{ name: 'A', phone: '5551990000001' }], baseSpec, noSleep);
        const body = calls.createCampaign[0] as Record<string, any>;
        expect(body.type).toBe('whatsapp');
        expect(body.flow).toBeUndefined();
        expect(body.connection).toBe('conn-1');
        expect(body.template).toBe('tmpl-1');
        expect(body.query).toEqual([{ type: 'in_segmentation', segmentation: 'seg-1' }, { type: 'whatsapp' }]);
    });

    it('empty audience: skips the campaign and reports empty_audience', async () => {
        const { client, calls } = fakeClient([0]);
        const md = new MassDispatch(client);
        const result = await md.run([{ name: 'A', phone: '5551990000001' }], { ...baseSpec, indexTimeoutMs: 5_000 }, noSleep);
        expect(calls.createCampaign.length).toBe(0);
        expect(result.status).toBe('empty_audience');
        expect(result.campaignId).toBeUndefined();
    });

    it('settleAttendances: transfers a filter to a sector/user in one batch call', async () => {
        const { client, calls } = fakeClient([0]);
        const md = new MassDispatch(client);
        await md.settleAttendances({
            action: 'transfer',
            target: { connection: 'conn-1', statuses: ['in_attendance'] },
            sector: 'sector-1',
            user: 'user-A',
            reason: 'reason-1',
        });
        expect(calls.servicesBatch.length).toBe(1);
        const body = calls.servicesBatch[0] as Record<string, any>;
        expect(body.type).toBe('transfer');
        expect(body.query).toEqual({ connection: 'conn-1', statuses: ['in_attendance'] });
        expect(body.action).toEqual({ sector: 'sector-1', reason: 'reason-1', user: 'user-A' });
    });

    it('settleAttendances: finishes an explicit id list without a user', async () => {
        const { client, calls } = fakeClient([0]);
        const md = new MassDispatch(client);
        await md.settleAttendances({ action: 'finished', target: { ids: ['s1', 's2'] }, reason: 'reason-1' });
        const body = calls.servicesBatch[0] as Record<string, any>;
        expect(body.type).toBe('finished');
        expect(body.query).toEqual({ ids: ['s1', 's2'] });
        expect(body.action.user).toBeUndefined();
    });

    it('rejects an empty contact list', async () => {
        const { client } = fakeClient([0]);
        const md = new MassDispatch(client);
        await expect(md.run([], baseSpec, noSleep)).rejects.toThrow(/no contacts/);
    });

    it('attendanceGuard skip: drops contacts already in attendance before import', async () => {
        const { client, calls } = fakeClient([1], [{ id: 'svc-1', status: 'in_attendance', phone: '5551990000002' }]);
        const md = new MassDispatch(client);
        const result = await md.run(
            [{ name: 'A', phone: '5551990000001' }, { name: 'B', phone: '5551990000002' }],
            { ...baseSpec, attendanceGuard: { mode: 'skip' } },
            noSleep,
        );
        const imported = JSON.parse(calls.createImport[0]!.fields.data!);
        expect(result.guard?.matched).toBe(1);
        expect(result.guard?.skipped).toBe(1);
        expect(result.imported).toBe(1);
        expect(calls.servicesBatch.length).toBe(0);
        expect(imported).toBeTruthy();
    });

    it('attendanceGuard skip: matches across the Brazilian 9th-digit variance', async () => {
        // contact given without the extra 9; open attendance stored with it (or vice-versa)
        const { client } = fakeClient([1], [{ id: 'svc-1', status: 'in_attendance', phone: '5551999596516' }]);
        const md = new MassDispatch(client);
        const result = await md.run(
            [{ name: 'A', phone: '555199596516' }],
            { ...baseSpec, attendanceGuard: { mode: 'skip' } },
            noSleep,
        );
        expect(result.guard?.matched).toBe(1);
        expect(result.status).toBe('empty_audience');
        expect(result.imported).toBe(0);
    });

    it('attendanceGuard finish: closes the open attendance in one batch then sends to everyone', async () => {
        const { client, calls } = fakeClient([2], [{ id: 'svc-9', status: 'in_attendance', phone: '5551990000002' }]);
        const md = new MassDispatch(client);
        const result = await md.run(
            [{ name: 'A', phone: '5551990000001' }, { name: 'B', phone: '5551990000002' }],
            { ...baseSpec, attendanceGuard: { mode: 'finish', finishReason: 'reason-x' } },
            noSleep,
        );
        expect(calls.servicesBatch.length).toBe(1);
        const batch = calls.servicesBatch[0] as Record<string, any>;
        expect(batch.type).toBe('finished');
        expect(batch.query).toEqual({ ids: ['svc-9'] });
        expect(batch.action.reason).toBe('reason-x');
        expect(result.guard?.finished).toBe(1);
        expect(result.imported).toBe(2);
        expect(result.status).toBe('sent');
    });

    it('attendanceGuard off (default): never sweeps services', async () => {
        const { client, calls } = fakeClient([1], [{ id: 'svc-1', status: 'in_attendance', phone: '5551990000001' }]);
        const md = new MassDispatch(client);
        const result = await md.run([{ name: 'A', phone: '5551990000001' }], baseSpec, noSleep);
        expect(calls.listServices.length).toBe(0);
        expect(result.guard).toBeUndefined();
        expect(result.imported).toBe(1);
    });
});
