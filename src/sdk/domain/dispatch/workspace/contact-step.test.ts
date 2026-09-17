import { describe, it, expect } from 'vitest';
import { applyContactStep, nextContactStep, writeAheadOf, type BlockContact, type ContactStep, type StepContext } from './contact-step';
import { toPersonSnapshot } from './payloads';
import { SYSTEM_USER, aContact, aRequest, attendanceItem, completed, page, personItem, settingsOf } from './__fixtures__/builders';
import type { DispatchContact, DispatchJob } from './types';

const NOW = 1_800_000_000_000;
const SETTINGS = settingsOf(aRequest());
const RESOLVING = { id: 'job', phase: 'resolving', settings: SETTINGS } as DispatchJob;
const MATERIALIZING = { id: 'job', phase: 'materializing', settings: SETTINGS, segmentationId: 'seg-1' } as DispatchJob;

/** The step context of a phase. */
function contextOf(job: DispatchJob, claims: ReadonlyMap<string, number> = new Map()): StepContext {
    return { settings: SETTINGS, claims, now: NOW, phase: job.phase as StepContext['phase'] };
}

/** The calls step of a block, asserting it is one. */
function callsStep(block: BlockContact, job: DispatchJob): Extract<ContactStep, { kind: 'calls' }> {
    const step = nextContactStep(block, job, NOW);

    if (step.kind !== 'calls') {
        throw new Error(`expected calls, got ${step.kind}`);
    }

    return step;
}

const personP1 = personItem({ id: 'p1', phone: '5551999000001', users: [SYSTEM_USER.id] });
const readyExisting: DispatchContact = aContact({ outcome: 'ready', person: { id: 'p1', existed: true }, ownerChange: { kind: 'keep' }, lookupPurpose: 'preview' });

describe('nextContactStep', () => {
    it('settles a contact without work in the phase', () => {
        expect(nextContactStep({ contact: aContact({ outcome: 'ready' }) }, RESOLVING, NOW)).toEqual({ kind: 'settled' });
        expect(nextContactStep({ contact: aContact({ outcome: 'inAudience' }) }, MATERIALIZING, NOW)).toEqual({ kind: 'settled' });
    });

    it('defers a contact while its retry delay runs', () => {
        expect(nextContactStep({ contact: aContact({ retryNotBefore: NOW + 1 }) }, RESOLVING, NOW)).toEqual({ kind: 'deferred', until: NOW + 1 });
        expect(nextContactStep({ contact: aContact({ retryNotBefore: NOW }) }, RESOLVING, NOW).kind).toBe('calls');
    });

    it('looks the person up in resolving, then its attendances', () => {
        expect(callsStep({ contact: aContact() }, RESOLVING).purpose).toBe('personLookup');
        expect(callsStep({ contact: aContact(), attendanceCheck: toPersonSnapshot(personP1) }, RESOLVING).purpose).toBe('attendanceLookup');
    });

    it('reconciles a pending write before anything else in materializing', () => {
        expect(callsStep({ contact: { ...readyExisting, pendingWrite: 'joinAudience', writesDone: 1 } }, MATERIALIZING).purpose).toBe('reconcile');
    });

    it('runs the send-time lookup only before the first write', () => {
        expect(callsStep({ contact: readyExisting }, MATERIALIZING).purpose).toBe('personLookup');
        expect(callsStep({ contact: { ...readyExisting, lookupPurpose: 'send' } }, MATERIALIZING).purpose).toEqual({ write: { kind: 'setFirstName' } });
        expect(callsStep({ contact: { ...readyExisting, writesDone: 1 } }, MATERIALIZING).purpose).toEqual({ write: { kind: 'joinAudience' } });
    });
});

describe('writeAheadOf', () => {
    it('marks only non-idempotent writes', () => {
        const create = { contact: aContact({ outcome: 'ready', lookupPurpose: 'send' }) };
        const put = { contact: { ...readyExisting, lookupPurpose: 'send' as const } };

        expect(writeAheadOf(create, callsStep(create, MATERIALIZING))).toMatchObject({ pendingWrite: 'createPerson', createSends: 1 });
        expect(writeAheadOf(put, callsStep(put, MATERIALIZING))).toBeUndefined();
    });
});

describe('applyContactStep', () => {
    it('holds the found person in memory for the attendance stage', () => {
        const block = { contact: aContact() };
        const application = applyContactStep(block, callsStep(block, RESOLVING), [completed(200, page([personP1])), completed(200, page([]))], contextOf(RESOLVING));

        expect(application).toMatchObject({ kind: 'applied', block: { contact: block.contact, attendanceCheck: { id: 'p1' } } });
    });

    it('claims the person of a contact that becomes ready', () => {
        const block = { contact: aContact({ index: 3 }), attendanceCheck: toPersonSnapshot(personP1) };
        const application = applyContactStep(block, callsStep(block, RESOLVING), [completed(200, page([]))], contextOf(RESOLVING));

        expect(application.kind === 'applied' && [...application.claims]).toEqual([['p1', 3]]);
        expect(application.kind === 'applied' && application.block).toEqual({ contact: expect.objectContaining({ outcome: 'ready', lookupPurpose: 'preview' }) });
    });

    it('makes a contact whose person another contact claimed repeatedPerson', () => {
        const block = { contact: aContact({ index: 3 }), attendanceCheck: toPersonSnapshot(personP1) };
        const application = applyContactStep(block, callsStep(block, RESOLVING), [completed(200, page([]))], contextOf(RESOLVING, new Map([['p1', 1]])));

        expect(application.kind === 'applied' && application.block.contact.outcome).toBe('repeatedPerson');
    });

    it('records the shift when the send-time lookup moves a ready contact out', () => {
        const block = { contact: readyExisting, attendanceCheck: toPersonSnapshot(personP1) };
        const application = applyContactStep(block, callsStep(block, MATERIALIZING), [completed(200, page([attendanceItem('s1', 'in_attendance')]))], contextOf(MATERIALIZING));

        expect(application).toMatchObject({ kind: 'applied', shiftedTo: 'inAttendance', block: { contact: { outcome: 'inAttendance', lookupPurpose: 'send' } } });
    });

    it('does not record a shift when the send-time lookup keeps the contact ready', () => {
        const block = { contact: readyExisting, attendanceCheck: toPersonSnapshot(personP1) };
        const application = applyContactStep(block, callsStep(block, MATERIALIZING), [completed(200, page([]))], contextOf(MATERIALIZING, new Map([['p1', 0]])));

        expect(application.kind === 'applied' && application.shiftedTo).toBeUndefined();
        expect(application.kind === 'applied' && application.block.contact).toMatchObject({ outcome: 'ready', lookupPurpose: 'send', ownerChange: { kind: 'replaceSystemOwners' } });
    });

    it('claims the person a create just produced', () => {
        const contact = aContact({ index: 2, outcome: 'ready', lookupPurpose: 'send', pendingWrite: 'createPerson', createSends: 1 });
        const block = { contact: { ...contact, pendingWrite: undefined } };
        const step = callsStep(block, MATERIALIZING);
        const application = applyContactStep({ contact }, step, [completed(201, { id: 'p-new' })], contextOf(MATERIALIZING));

        expect(application.kind === 'applied' && [...application.claims]).toEqual([['p-new', 2]]);
    });

    it('carries the contact state to persist when the block stops', () => {
        const contact = aContact({ outcome: 'ready', lookupPurpose: 'send', pendingWrite: 'createPerson', createSends: 1 });
        const step = callsStep({ contact: { ...contact, pendingWrite: undefined } }, MATERIALIZING);

        expect(applyContactStep({ contact }, step, [{ kind: 'throttled' }], contextOf(MATERIALIZING))).toEqual({
            kind: 'stopBlock',
            cause: 'throttled',
            block: { contact: { ...contact, pendingWrite: undefined, createSends: 0 } },
        });
    });

    it('reports a refused token with the unchanged contact', () => {
        const block = { contact: aContact() };

        expect(applyContactStep(block, callsStep(block, RESOLVING), [completed(401), completed(200, page([]))], contextOf(RESOLVING))).toEqual({
            kind: 'tokenRejected',
            strategy: 'workspace',
            block: { contact: block.contact },
        });
    });
});
