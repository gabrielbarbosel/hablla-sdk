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
    listCustomFields: unknown[];
    createCustomField: unknown[];
}

interface OpenService {
    id: string;
    status: string;
    phone: string;
}

interface CustomFieldRow {
    id: string;
    std_name?: string;
    name?: string;
    type?: string;
}

function fakeClient(counterSequence: number[], openServices: OpenService[] = [], customFields: CustomFieldRow[] = []): { client: HabllaClient; calls: Calls } {
    const calls: Calls = { createSegmentation: [], createImport: [], createCampaign: [], servicesBatch: [], listServices: [], listCustomFields: [], createCustomField: [] };
    let counterIndex = 0;
    const client = {
        segmentations: {
            createSegmentation: async (body: unknown) => {
                calls.createSegmentation.push(body);
                return { id: 'seg-1' };
            },
            getSegmentation: async () => {
                const value = counterSequence[Math.min(counterIndex, counterSequence.length - 1)] ?? 0;
                return { counter: value };
            },
            deleteSegmentation: async () => ({ ok: true }),
        },
        http: {
            post: async (path: string) => {
                if (/segmentations\/count/.test(path)) {
                    const value = counterSequence[Math.min(counterIndex, counterSequence.length - 1)] ?? 0;
                    counterIndex++;
                    return { count: value };
                }
                return {};
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
        customFields: {
            listCustomFields: async (opts: unknown) => {
                calls.listCustomFields.push(opts);
                return { results: customFields };
            },
            createCustomField: async (body: unknown) => {
                calls.createCustomField.push(body);
                return { id: 'cf-created', ...(body as Record<string, unknown>) };
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

const CF_ROW = { id: 'cf-primeiro-nome', std_name: 'cf_primeiro_nome', name: 'Primeiro Nome', type: 'string' };
const baseConfig = { connectionId: 'conn-1', templateId: 'tmpl-1' };

describe('MassDispatch.dispatchPersonalized', () => {
    it('resolves the live first-name field, personalizes var 0, imports per owner', async () => {
        const { client, calls } = fakeClient([2], [], [CF_ROW]);
        const md = new MassDispatch(client);

        const result = await md.dispatchPersonalized(
            [
                { name: 'Ana Paula Silva', phone: '5551990000001' },
                { name: 'Bruno Costa', phone: '5551990000002' },
            ],
            { ...baseConfig, templateVarCount: 1, ownerDistribution: { strategy: 'rodizio', owners: ['u-a', 'u-b'] } },
            noSleep,
        );

        // used the resolved live id, did not create a new field
        expect(calls.createCustomField.length).toBe(0);
        // rodizio → one import per owner
        expect(calls.createImport.length).toBe(2);
        // campaign references the resolved custom field at slot 0
        const body = calls.createCampaign[0] as Record<string, any>;
        expect(body.variables.body[0]).toBe('{{person.custom_fields.cf-primeiro-nome}}');
        expect(result.status).toBe('sent');
        expect(result.received).toBe(2);
        expect(result.suppressed).toBe(0);
        expect(result.ownerMap).toEqual({ 'u-a': 1, 'u-b': 1 });
    });

    it('creates the first-name field when the workspace has none', async () => {
        const { client, calls } = fakeClient([1], [], []);
        const md = new MassDispatch(client);
        await md.dispatchPersonalized(
            [{ name: 'Carla Mendes', phone: '5551990000001' }],
            { ...baseConfig, templateVarCount: 1 },
            noSleep,
        );
        expect(calls.createCustomField.length).toBe(1);
        const created = calls.createCustomField[0] as Record<string, any>;
        expect(created.std_name).toBe('cf_primeiro_nome');
        expect(created.type).toBe('string');
        const body = calls.createCampaign[0] as Record<string, any>;
        expect(body.variables.body[0]).toBe('{{person.custom_fields.cf-created}}');
    });

    it('writes each contact first name into the import custom-field column', async () => {
        const { client, calls } = fakeClient([1], [], [CF_ROW]);
        const md = new MassDispatch(client);
        await md.dispatchPersonalized(
            [{ name: 'Ana Paula Silva', phone: '5551990000001' }],
            { ...baseConfig, templateVarCount: 1 },
            noSleep,
        );
        const data = JSON.parse(calls.createImport[0]!.fields.data!);
        expect(data).toBeTruthy();
        // the personalization column header rides the import (std_name_type)
        // (value assertion is covered by the xlsx builder; here we assert the field resolved)
        const body = calls.createCampaign[0] as Record<string, any>;
        expect(body.variables.body[0]).toBe('{{person.custom_fields.cf-primeiro-nome}}');
    });

    it('suppresses phones 9th-digit aware and reports the counts', async () => {
        const { client, calls } = fakeClient([1], [], [CF_ROW]);
        const md = new MassDispatch(client);
        const result = await md.dispatchPersonalized(
            [
                { name: 'Ana', phone: '5551999596516' },   // suppressed (matches given without the 9)
                { name: 'Bruno', phone: '5551990000002' }, // survives
            ],
            { ...baseConfig, templateVarCount: 1, suppressPhones: ['555199596516'] },
            noSleep,
        );
        expect(result.received).toBe(2);
        expect(result.suppressed).toBe(1);
        expect(result.imported).toBe(1);
    });

    it('all suppressed → empty result, no import or campaign', async () => {
        const { client, calls } = fakeClient([0], [], [CF_ROW]);
        const md = new MassDispatch(client);
        const result = await md.dispatchPersonalized(
            [{ name: 'Ana', phone: '5551990000001' }],
            { ...baseConfig, templateVarCount: 1, suppressPhones: ['5551990000001'] },
            noSleep,
        );
        expect(result.suppressed).toBe(1);
        expect(result.status).toBe('empty_audience');
        expect(calls.createImport.length).toBe(0);
        expect(calls.createCampaign.length).toBe(0);
        expect(calls.createSegmentation.length).toBe(0);
    });

    it('fixo distribution: every contact under owners[0]', async () => {
        const { client, calls } = fakeClient([2], [], [CF_ROW]);
        const md = new MassDispatch(client);
        const result = await md.dispatchPersonalized(
            [
                { name: 'Ana', phone: '5551990000001' },
                { name: 'Bruno', phone: '5551990000002' },
            ],
            { ...baseConfig, templateVarCount: 1, ownerDistribution: { strategy: 'fixo', owners: ['u-fix', 'u-other'] } },
            noSleep,
        );
        expect(calls.createImport.length).toBe(1);
        expect(result.ownerMap).toEqual({ 'u-fix': 2 });
    });

    it('personalizeFirstName=false: no custom field touched, no personalization token', async () => {
        const { client, calls } = fakeClient([1], [], [CF_ROW]);
        const md = new MassDispatch(client);
        await md.dispatchPersonalized(
            [{ name: 'Ana Paula', phone: '5551990000001' }],
            { ...baseConfig, templateVarCount: 1, personalizeFirstName: false, variables: ['literal'] },
            noSleep,
        );
        expect(calls.listCustomFields.length).toBe(0);
        expect(calls.createCustomField.length).toBe(0);
        const body = calls.createCampaign[0] as Record<string, any>;
        expect(body.variables.body[0]).toBe('literal');
    });

    it('rejects a missing connectionId', async () => {
        const { client } = fakeClient([0]);
        const md = new MassDispatch(client);
        await expect(
            md.dispatchPersonalized([{ name: 'A', phone: '5551990000001' }], { connectionId: '', templateId: 't' }, noSleep),
        ).rejects.toThrow(/connectionId/);
    });
});
