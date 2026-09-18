import { describe, it, expect } from 'vitest';
import { applyWriteResult, planContactWrites, withWriteAhead, writeCallFor, type ContactWrite } from './contact-writes';
import { CALL_RETRY_DELAY_MS, RECONCILIATION_DELAY_MS } from './constants';
import { createJob } from './job-machine';
import { prepareAudience } from './audience';
import { ADVISOR, FIRST_NAME_FIELD_ID, NO_CALLS_SPENT, OTHER_ADVISOR, ROSTER, SECTOR_ID, SYSTEM_USER, ZENVIA_IDS_FIELD_ID, aContact, aRequest, completed } from './__fixtures__/builders';
import type { DispatchContact, DispatchJob, DispatchSettings, WorkspaceDispatchRequest } from './types';

const NOW = 1_800_000_000_000;
const SEGMENTATION_ID = '6aab098d88aca07a08c6566f';

/** A materializing job with a segmentation. */
function aJob(overrides: Partial<WorkspaceDispatchRequest> = {}): DispatchJob {
    const request = aRequest(overrides);
    return { ...createJob(prepareAudience(request, ROSTER), request, NOW, NO_CALLS_SPENT), phase: 'materializing', segmentationId: SEGMENTATION_ID };
}

/** The settings of a job built from the default request. */
function settings(overrides: Partial<WorkspaceDispatchRequest> = {}): DispatchSettings {
    return aJob(overrides).settings;
}

/** Settings that write nothing into an existing person; valid only with no variable read from a person field. */
function noFieldWrites(): DispatchSettings {
    return settings({ existingPersonFieldPolicy: 'none', templateVariables: [{ kind: 'literal', value: 'Setembro', formats: [] }] });
}

/** A ready contact for an existing person with the given owner change. */
function existing(ownerChange: DispatchContact['ownerChange']): DispatchContact {
    return aContact({ outcome: 'ready', person: { id: 'p1', existed: true }, ownerChange, lookupPurpose: 'send' });
}

describe('planContactWrites', () => {
    it('creates a new person and then joins', () => {
        expect(planContactWrites(aContact({ outcome: 'ready' }), settings())).toEqual([{ kind: 'createPerson' }, { kind: 'joinAudience' }]);
    });

    it('keeps the new-person plan after the create, so the next write is the join', () => {
        const created = aContact({ outcome: 'ready', person: { id: 'p9', existed: false }, writesDone: 1 });

        expect(planContactWrites(created, settings())[created.writesDone]).toEqual({ kind: 'joinAudience' });
    });

    it.each([
        ['keep', { kind: 'keep' }, ['setPersonFields', 'joinAudience']],
        ['assign', { kind: 'assign', unfollowFirst: false }, ['setPersonFields', 'addTargetOwner', 'joinAudience']],
        ['assign after unfollowing', { kind: 'assign', unfollowFirst: true }, ['setPersonFields', 'unfollowTarget', 'addTargetOwner', 'joinAudience']],
        ['add beside system owners', { kind: 'addBesideSystemOwners', unfollowFirst: false }, ['setPersonFields', 'addTargetOwner', 'joinAudience']],
        ['replace system owners', { kind: 'replaceSystemOwners', unfollowFirst: true, removedOwnerIds: [SYSTEM_USER.id] }, ['setPersonFields', 'unfollowTarget', 'addTargetOwner', 'removeOwners', 'joinAudience']],
        ['replace human owners', { kind: 'replaceHumanOwners', unfollowFirst: false, removedOwnerIds: [OTHER_ADVISOR.id] }, ['setPersonFields', 'addTargetOwner', 'removeOwners', 'joinAudience']],
    ] as Array<[string, DispatchContact['ownerChange'], string[]]>)('plans %s for an existing person', (_label, ownerChange, kinds) => {
        expect(planContactWrites(existing(ownerChange), settings()).map((write) => write.kind)).toEqual(kinds);
    });

    it('skips the field write when the policy updates nothing in an existing person', () => {
        expect(planContactWrites(existing({ kind: 'keep' }), noFieldWrites()).map((write) => write.kind)).toEqual(['joinAudience']);
    });

    it('skips the field write when the row sent no field at all', () => {
        const contact = { ...existing({ kind: 'keep' }), customFields: {} };

        expect(planContactWrites(contact, settings()).map((write) => write.kind)).toEqual(['joinAudience']);
    });

    it('still writes the fields of a person it creates, whatever the existing-person policy says', () => {
        expect(planContactWrites(aContact({ outcome: 'ready' }), noFieldWrites())).toEqual([{ kind: 'createPerson' }, { kind: 'joinAudience' }]);
    });
});

describe('writeCallFor', () => {
    it('creates the person upper-cased, with the 13-digit WhatsApp phone, owner, sector and custom fields', () => {
        const contact = aContact({ name: 'Ana Paula Souza', phone: { digits: '555199000001', alternate: '5551999000001' }, customFields: { [FIRST_NAME_FIELD_ID]: 'Ana', [ZENVIA_IDS_FIELD_ID]: '42' } });

        expect(writeCallFor({ kind: 'createPerson' }, contact, aJob())).toEqual({
            method: 'POST',
            rawPath: '/v1/workspaces/{workspace_id}/persons',
            strategy: 'workspace',
            body: {
                name: 'ANA PAULA SOUZA',
                phones: [{ phone: '5551999000001', is_whatsapp: true, type: 'personal' }],
                users: [ADVISOR.id],
                sectors: [SECTOR_ID],
                custom_fields: [{ custom_field: FIRST_NAME_FIELD_ID, value: 'Ana' }, { custom_field: ZENVIA_IDS_FIELD_ID, value: '42' }],
            },
        });
    });

    it('sets on an existing person exactly the fields the row sent', () => {
        const contact = { ...existing({ kind: 'keep' }), customFields: { [FIRST_NAME_FIELD_ID]: 'Ana', [ZENVIA_IDS_FIELD_ID]: '42' } };

        expect(writeCallFor({ kind: 'setPersonFields' }, contact, aJob())).toMatchObject({
            method: 'PUT',
            pathParams: { person_id: 'p1' },
            body: { custom_fields: [{ custom_field: FIRST_NAME_FIELD_ID, value: 'Ana' }, { custom_field: ZENVIA_IDS_FIELD_ID, value: '42' }] },
        });
    });

    it('builds the owner writes and the join for the target and the segmentation', () => {
        const contact = existing({ kind: 'replaceSystemOwners', unfollowFirst: true, removedOwnerIds: [SYSTEM_USER.id] });
        const job = aJob();

        expect(writeCallFor({ kind: 'unfollowTarget' }, contact, job).body).toEqual({ followers: [ADVISOR.id] });
        expect(writeCallFor({ kind: 'addTargetOwner' }, contact, job).body).toEqual({ users: [ADVISOR.id] });
        expect(writeCallFor({ kind: 'removeOwners', userIds: [SYSTEM_USER.id] }, contact, job).body).toEqual({ users: [SYSTEM_USER.id] });
        expect(writeCallFor({ kind: 'joinAudience' }, contact, job)).toMatchObject({ pathParams: { segmentation_id: SEGMENTATION_ID }, body: { person: 'p1' } });
    });
});

describe('withWriteAhead', () => {
    it('marks the create and counts its send', () => {
        expect(withWriteAhead(aContact({ createSends: 1 }), { kind: 'createPerson' })).toMatchObject({ pendingWrite: 'createPerson', createSends: 2 });
    });

    it('marks the join without counting a create send', () => {
        expect(withWriteAhead(aContact(), { kind: 'joinAudience' })).toMatchObject({ pendingWrite: 'joinAudience', createSends: 0 });
    });
});

describe('applyWriteResult', () => {
    const CREATE: ContactWrite = { kind: 'createPerson' };
    const JOIN: ContactWrite = { kind: 'joinAudience' };
    const PUT: ContactWrite = { kind: 'setPersonFields' };
    const pendingCreate = withWriteAhead(aContact({ outcome: 'ready' }), { kind: 'createPerson' });

    it('records the created person and advances', () => {
        expect(applyWriteResult(pendingCreate, CREATE, [completed(201, { id: 'p-new' })], NOW)).toEqual({
            kind: 'decided',
            contact: { ...pendingCreate, pendingWrite: undefined, person: { id: 'p-new', existed: false }, writesDone: 1, attempts: 0, failure: undefined, retryNotBefore: undefined },
        });
    });

    it('fails a create whose response has no id', () => {
        const resolution = applyWriteResult(pendingCreate, CREATE, [completed(201, {})], NOW);

        expect(resolution.kind === 'decided' && resolution.contact).toMatchObject({ outcome: 'writeFailed', pendingWrite: undefined, failure: { status: 201 } });
    });

    it('makes a joined contact inAudience with its item', () => {
        const joining = withWriteAhead(existing({ kind: 'keep' }), { kind: 'joinAudience' });
        const resolution = applyWriteResult({ ...joining, writesDone: 1 }, JOIN, [completed(201, { id: 'item-1' })], NOW);

        expect(resolution.kind === 'decided' && resolution.contact).toMatchObject({ outcome: 'inAudience', audienceItemId: 'item-1', writesDone: 2, pendingWrite: undefined });
    });

    it('advances an idempotent write on a 2xx', () => {
        const resolution = applyWriteResult(existing({ kind: 'keep' }), PUT, [completed(200)], NOW);

        expect(resolution.kind === 'decided' && resolution.contact.writesDone).toBe(1);
    });

    it('fails on a 4xx and clears the write-ahead', () => {
        const resolution = applyWriteResult(pendingCreate, CREATE, [completed(422, { message: 'invalid phone' })], NOW);

        expect(resolution.kind === 'decided' && resolution.contact).toMatchObject({ outcome: 'writeFailed', pendingWrite: undefined, createSends: 1, failure: { status: 422 } });
    });

    it('retries an idempotent write later on a 5xx', () => {
        expect(applyWriteResult(existing({ kind: 'keep' }), PUT, [completed(500)], NOW)).toMatchObject({ kind: 'retryLater', contact: { attempts: 1, retryNotBefore: NOW + CALL_RETRY_DELAY_MS } });
    });

    it('keeps the write-ahead of a create with an unknown outcome and waits to reconcile', () => {
        expect(applyWriteResult(pendingCreate, CREATE, [completed(502)], NOW)).toMatchObject({
            kind: 'retryLater',
            contact: { pendingWrite: 'createPerson', attempts: 1, retryNotBefore: NOW + RECONCILIATION_DELAY_MS },
        });
        expect(applyWriteResult(pendingCreate, CREATE, [{ kind: 'transportFailed', message: 'reset' }], NOW)).toMatchObject({ kind: 'retryLater', contact: { pendingWrite: 'createPerson' } });
    });

    it('stops on an interrupted wave, keeping the create marker without spending an attempt', () => {
        expect(applyWriteResult(pendingCreate, CREATE, [{ kind: 'interrupted', message: 'down' }], NOW)).toEqual({
            kind: 'stopBlock',
            cause: 'interrupted',
            contact: { ...pendingCreate, retryNotBefore: NOW + RECONCILIATION_DELAY_MS },
        });
    });

    it('stops on a throttle, undoing the create marker and its send', () => {
        expect(applyWriteResult(pendingCreate, CREATE, [{ kind: 'throttled' }], NOW)).toEqual({
            kind: 'stopBlock',
            cause: 'throttled',
            contact: { ...pendingCreate, pendingWrite: undefined, createSends: 0 },
        });
    });

    it('stops an idempotent write on a throttle without changing the contact', () => {
        expect(applyWriteResult(existing({ kind: 'keep' }), PUT, [{ kind: 'unsent' }], NOW)).toEqual({ kind: 'stopBlock', cause: 'throttled' });
    });

    it('reports a refused token, undoing the write-ahead that was not applied', () => {
        expect(applyWriteResult(pendingCreate, CREATE, [completed(401)], NOW)).toEqual({
            kind: 'tokenRejected',
            contact: { ...pendingCreate, pendingWrite: undefined, createSends: 0 },
        });
    });
});
