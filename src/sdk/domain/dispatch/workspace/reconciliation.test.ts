import { describe, it, expect } from 'vitest';
import { applyReconciliation, reconciliationCalls } from './reconciliation';
import { CALL_RETRY_DELAY_MS } from './constants';
import { aContact, completed, page, personItem } from './__fixtures__/builders';
import type { DispatchContact, DispatchJob } from './types';

const NOW = 1_800_000_000_000;
const JOB = { id: 'job', segmentationId: 'seg-1' } as DispatchJob;

const pendingCreate: DispatchContact = aContact({ outcome: 'ready', pendingWrite: 'createPerson', createSends: 1 });
const pendingJoin: DispatchContact = aContact({ outcome: 'ready', person: { id: 'p1', existed: true }, pendingWrite: 'joinAudience', writesDone: 1, attempts: 1 });

describe('reconciliationCalls', () => {
    it('lists persons by both phone shapes on v1 for a pending create', () => {
        expect(reconciliationCalls(pendingCreate, JOB)).toEqual([
            { method: 'GET', rawPath: '/v1/workspaces/{workspace_id}/persons', query: { phone: '5551999000001', limit: 50 }, strategy: 'workspace' },
            { method: 'GET', rawPath: '/v1/workspaces/{workspace_id}/persons', query: { phone: '555199000001', limit: 50 }, strategy: 'workspace' },
        ]);
    });

    it('lists the person\'s segmentation items for a pending join', () => {
        expect(reconciliationCalls(pendingJoin, JOB)).toEqual([{
            method: 'GET',
            rawPath: '/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items',
            pathParams: { segmentation_id: 'seg-1' },
            query: { person: 'p1', limit: 50 },
            strategy: 'workspace',
        }]);
    });
});

describe('applyReconciliation of a create', () => {
    it('confirms the create when one person holds the phone', () => {
        const resolution = applyReconciliation(pendingCreate, [completed(200, page([personItem({ id: 'p-new', phone: '5551999000001' })])), completed(200, page([]))], NOW);

        expect(resolution.kind === 'decided' && resolution.contact).toMatchObject({ person: { id: 'p-new', existed: false }, writesDone: 1, pendingWrite: undefined, outcome: 'ready' });
    });

    it('reports duplicatePersons when two persons hold the phone', () => {
        const resolution = applyReconciliation(pendingCreate, [
            completed(200, page([personItem({ id: 'p1', phone: '5551999000001' })])),
            completed(200, page([personItem({ id: 'p2', phone: '555199000001' })])),
        ], NOW);

        expect(resolution.kind === 'decided' && resolution.contact.outcome).toBe('duplicatePersons');
    });

    it('clears the marker to send again when nothing was created and a send is left', () => {
        const resolution = applyReconciliation(pendingCreate, [completed(200, page([])), completed(200, page([]))], NOW);

        expect(resolution.kind === 'decided' && resolution.contact).toMatchObject({ outcome: 'ready', pendingWrite: undefined, writesDone: 0, createSends: 1 });
    });

    it('fails when nothing was created after the last send', () => {
        const resolution = applyReconciliation({ ...pendingCreate, createSends: 2 }, [completed(200, page([])), completed(200, page([]))], NOW);

        expect(resolution.kind === 'decided' && resolution.contact).toMatchObject({ outcome: 'writeFailed', failure: { detail: 'person not found after 2 create sends with lost responses' } });
    });
});

describe('applyReconciliation of a join', () => {
    it('confirms the join when the item exists', () => {
        const item = { id: 'item-1', person: 'p1' };
        const resolution = applyReconciliation(pendingJoin, [completed(200, page([item]))], NOW);

        expect(resolution.kind === 'decided' && resolution.contact).toMatchObject({ outcome: 'inAudience', audienceItemId: 'item-1', writesDone: 2, attempts: 0, pendingWrite: undefined });
    });

    it('clears the marker to join again when the item is missing', () => {
        const resolution = applyReconciliation(pendingJoin, [completed(200, page([]))], NOW);

        expect(resolution.kind === 'decided' && resolution.contact).toMatchObject({ outcome: 'ready', pendingWrite: undefined, writesDone: 1 });
    });

    it('fails when the item is still missing after the last attempt', () => {
        const resolution = applyReconciliation({ ...pendingJoin, attempts: 3 }, [completed(200, page([]))], NOW);

        expect(resolution.kind === 'decided' && resolution.contact.outcome).toBe('writeFailed');
    });
});

describe('applyReconciliation failures', () => {
    it('stops the block without touching the contact', () => {
        expect(applyReconciliation(pendingCreate, [{ kind: 'throttled' }, { kind: 'unsent' }], NOW)).toEqual({ kind: 'stopBlock', cause: 'throttled' });
    });

    it('reports a refused token', () => {
        expect(applyReconciliation(pendingJoin, [completed(403)], NOW)).toEqual({ kind: 'tokenRejected' });
    });

    it('retries the read later on a 5xx, keeping the marker', () => {
        expect(applyReconciliation(pendingCreate, [completed(500), completed(200, page([]))], NOW)).toMatchObject({
            kind: 'retryLater',
            contact: { pendingWrite: 'createPerson', attempts: 1, retryNotBefore: NOW + CALL_RETRY_DELAY_MS },
        });
    });
});
