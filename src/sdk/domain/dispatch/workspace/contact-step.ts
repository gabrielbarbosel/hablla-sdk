/**
 * Per-contact step selection and application for the chunked phases. Each round asks
 * every contact of a block for its next step, runs all the calls of the round together,
 * and applies each contact's slice of results here.
 */

import type { CallResult, HttpCall } from '../../../core/call-executor';
import type { AuthStrategy } from '../../../core/strategy';
import type { ContactResolution, StopCause } from './call-failures';
import type { ContactWrite } from './contact-writes';
import type { PersonSnapshot } from './owner-policy';
import type { ChunkedPhase, ContactOutcome, DispatchContact, DispatchJob, DispatchSettings, LookupPurpose } from './types';
import { rejectedTokenStrategy } from './call-failures';
import { applyWriteResult, isWriteAhead, planContactWrites, withWriteAhead, writeCallFor } from './contact-writes';
import { attendanceLookupCalls, personLookupCalls, resolveAttendanceLookup, resolvePersonLookup } from './lookup';
import { claimPerson } from './person-claims';
import { applyReconciliation, reconciliationCalls } from './reconciliation';

/** A contact inside a block; `attendanceCheck` holds the person between the two lookup stages, in memory only. */
export interface BlockContact {
    contact: DispatchContact;
    attendanceCheck?: PersonSnapshot;
}

/** What a round of calls is for. */
export type StepPurpose = 'personLookup' | 'attendanceLookup' | 'reconcile' | { write: ContactWrite };

/** The next thing a contact needs. */
export type ContactStep =
    | { kind: 'calls'; purpose: StepPurpose; calls: readonly HttpCall[] }
    | { kind: 'deferred'; until: number }
    | { kind: 'settled' };

/** What applying a step needs besides the contact. */
export interface StepContext {
    settings: DispatchSettings;
    claims: ReadonlyMap<string, number>;
    now: number;
    phase: ChunkedPhase;
}

/**
 * Result of applying a step: the updated block contact (with the person claims and, when
 * the send-time lookup moved the contact out of `ready`, the outcome it moved to), or a
 * reason the block must stop or the job must fail, with the contact state to persist.
 */
export type StepApplication =
    | { kind: 'applied'; block: BlockContact; claims: ReadonlyMap<string, number>; shiftedTo?: ContactOutcome }
    | { kind: 'stopBlock'; cause: StopCause; block: BlockContact }
    | { kind: 'tokenRejected'; strategy: AuthStrategy; block: BlockContact };

/** A step application before the refused token is named from the step's calls. */
type StepOutcome =
    | Extract<StepApplication, { kind: 'applied' } | { kind: 'stopBlock' }>
    | { kind: 'tokenRejected'; block: BlockContact };

/** The outcome that means a contact still has work in a phase. */
export function workOutcomeOf(phase: ChunkedPhase): ContactOutcome {
    return phase === 'resolving' ? 'pendingLookup' : 'ready';
}

/**
 * The next step of a contact, in order: nothing when it has no work in the phase; wait
 * while its retry delay runs; in `resolving`, the preview lookup; in `materializing`,
 * the reconciliation of a pending write, then the send-time lookup (only before the
 * first write, so it never sees the dispatch's own writes), then the next planned write.
 */
export function nextContactStep(block: BlockContact, job: DispatchJob, now: number): ContactStep {
    const { contact } = block;
    const phase = chunkedPhaseOf(job);

    if (contact.outcome !== workOutcomeOf(phase)) {
        return { kind: 'settled' };
    }

    if (contact.retryNotBefore !== undefined && contact.retryNotBefore > now) {
        return { kind: 'deferred', until: contact.retryNotBefore };
    }

    if (phase === 'resolving') {
        return lookupStep(block, job);
    }

    if (contact.pendingWrite) {
        return { kind: 'calls', purpose: 'reconcile', calls: reconciliationCalls(contact, job) };
    }

    if (contact.writesDone === 0 && contact.lookupPurpose !== 'send') {
        return lookupStep(block, job);
    }

    const write = planContactWrites(contact)[contact.writesDone]!;

    return { kind: 'calls', purpose: { write }, calls: [writeCallFor(write, contact, job)] };
}

/**
 * The contact to persist before a step's calls are sent: the write-ahead marker of a
 * non-idempotent write, or `undefined` when the step needs none.
 */
export function writeAheadOf(block: BlockContact, step: ContactStep): DispatchContact | undefined {
    if (step.kind !== 'calls' || typeof step.purpose !== 'object' || !isWriteAhead(step.purpose.write)) {
        return undefined;
    }

    return withWriteAhead(block.contact, step.purpose.write);
}

/** Applies a step's results to its contact, naming the refused token from the step's own calls. */
export function applyContactStep(block: BlockContact, step: Extract<ContactStep, { kind: 'calls' }>, results: readonly CallResult[], context: StepContext): StepApplication {
    const outcome = applyStepResults(block, step, results, context);

    return outcome.kind === 'tokenRejected'
        ? { ...outcome, strategy: rejectedTokenStrategy(step.calls, results) }
        : outcome;
}

/** Applies a step's results, leaving the refused token to {@link applyContactStep}. */
function applyStepResults(block: BlockContact, step: Extract<ContactStep, { kind: 'calls' }>, results: readonly CallResult[], context: StepContext): StepOutcome {
    const { contact } = block;
    const purpose = lookupPurposeOf(context.phase);

    if (step.purpose === 'personLookup') {
        const resolution = resolvePersonLookup(contact, results, purpose, context.now);

        if (resolution.kind === 'checkAttendance') {
            return { kind: 'applied', block: { contact, attendanceCheck: resolution.person }, claims: context.claims };
        }

        return applyLookupResolution(contact, resolution, context);
    }

    if (step.purpose === 'attendanceLookup') {
        const person = requireAttendanceCheck(block);

        return applyLookupResolution(contact, resolveAttendanceLookup(contact, person, results, context.settings, purpose, context.now), context);
    }

    if (step.purpose === 'reconcile') {
        return applyResolution(contact, applyReconciliation(contact, results, context.now), context);
    }

    return applyResolution(contact, applyWriteResult(contact, step.purpose.write, results, context.now), context);
}

/** The lookup step of a contact: the attendance stage when its person is known, the person stage otherwise. */
function lookupStep(block: BlockContact, job: DispatchJob): ContactStep {
    if (block.attendanceCheck) {
        return { kind: 'calls', purpose: 'attendanceLookup', calls: attendanceLookupCalls(block.attendanceCheck, block.contact, job.settings.connectionId) };
    }

    return { kind: 'calls', purpose: 'personLookup', calls: personLookupCalls(block.contact) };
}

/** Applies a lookup resolution and records the shift when the send-time lookup moved the contact out of `ready`. */
function applyLookupResolution(before: DispatchContact, resolution: ContactResolution, context: StepContext): StepOutcome {
    const application = applyResolution(before, resolution, context);

    if (application.kind !== 'applied' || context.phase !== 'materializing' || application.block.contact.outcome === 'ready') {
        return application;
    }

    return { ...application, shiftedTo: application.block.contact.outcome };
}

/**
 * Applies a contact resolution. A contact that reaches a person while still `ready`
 * claims it; a person already claimed by another contact makes it `repeatedPerson`.
 */
function applyResolution(before: DispatchContact, resolution: ContactResolution, context: StepContext): StepOutcome {
    switch (resolution.kind) {
        case 'stopBlock':
            return { kind: 'stopBlock', cause: resolution.cause, block: { contact: resolution.contact ?? before } };
        case 'tokenRejected':
            return { kind: 'tokenRejected', block: { contact: resolution.contact ?? before } };
        case 'retryLater':
            return { kind: 'applied', block: { contact: resolution.contact }, claims: context.claims };
        case 'decided':
            return claimResolvedPerson(resolution.contact, context);
    }
}

/** Claims the person of a `ready` or `inAudience` contact. */
function claimResolvedPerson(contact: DispatchContact, context: StepContext): StepOutcome {
    const holdsPerson = contact.person !== undefined && (contact.outcome === 'ready' || contact.outcome === 'inAudience');

    if (!holdsPerson) {
        return { kind: 'applied', block: { contact }, claims: context.claims };
    }

    const claim = claimPerson(context.claims, contact.person!.id, contact.index);

    if (claim.kind === 'claimedByOther') {
        return { kind: 'applied', block: { contact: { ...contact, outcome: 'repeatedPerson' } }, claims: context.claims };
    }

    return { kind: 'applied', block: { contact }, claims: claim.claims };
}

/** The lookup purpose of a phase. */
function lookupPurposeOf(phase: ChunkedPhase): LookupPurpose {
    return phase === 'resolving' ? 'preview' : 'send';
}

/**
 * The job's phase when it is a chunked one.
 *
 * @throws Error for any other phase (a planning bug).
 */
function chunkedPhaseOf(job: DispatchJob): ChunkedPhase {
    if (job.phase !== 'resolving' && job.phase !== 'materializing') {
        throw new Error(`Dispatch job ${job.id} is not in a chunked phase (${job.phase})`);
    }

    return job.phase;
}

/**
 * The person held between the lookup stages.
 *
 * @throws Error when the attendance stage runs without it (a planning bug).
 */
function requireAttendanceCheck(block: BlockContact): PersonSnapshot {
    if (!block.attendanceCheck) {
        throw new Error(`Contact ${block.contact.index} has no person to check attendances for`);
    }

    return block.attendanceCheck;
}
