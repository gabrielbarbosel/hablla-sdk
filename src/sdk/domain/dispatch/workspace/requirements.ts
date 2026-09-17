/**
 * Accessors for the contact and job fields that the planning guarantees at a given step. A
 * missing field there is a planning bug, so it throws instead of being defaulted.
 */

import type { PhoneVariants } from '../../../utils';
import type { DispatchContact, DispatchJob, HabllaDispatchConfig, OwnerChange, ResolvedPerson, TargetOwner } from './types';

/**
 * The contact's phone.
 *
 * @throws Error when the contact has no valid phone.
 */
export function requirePhone(contact: DispatchContact): PhoneVariants {
    if (!contact.phone) {
        throw new Error(`Contact ${contact.index} has no phone`);
    }

    return contact.phone;
}

/**
 * The contact's target owner.
 *
 * @throws Error when the contact has no target owner.
 */
export function requireTarget(contact: DispatchContact): TargetOwner {
    if (!contact.target) {
        throw new Error(`Contact ${contact.index} has no target owner`);
    }

    return contact.target;
}

/**
 * The person the contact resolved to.
 *
 * @throws Error when the contact has no person yet.
 */
export function requirePerson(contact: DispatchContact): ResolvedPerson {
    if (!contact.person) {
        throw new Error(`Contact ${contact.index} has no person`);
    }

    return contact.person;
}

/**
 * The owner change an existing person was resolved with.
 *
 * @throws Error when the contact has no owner change.
 */
export function requireOwnerChange(contact: DispatchContact): OwnerChange {
    if (!contact.ownerChange) {
        throw new Error(`Contact ${contact.index} has no owner change`);
    }

    return contact.ownerChange;
}

/**
 * The job's segmentation id; set by `start` before any write.
 *
 * @throws Error when the job has no segmentation.
 */
export function requireSegmentationId(job: DispatchJob): string {
    if (!job.segmentationId) {
        throw new Error(`Dispatch job ${job.id} has no segmentation`);
    }

    return job.segmentationId;
}

/**
 * The job's pacing in Hablla units; set by `start`.
 *
 * @throws Error when the job has no dispatch config.
 */
export function requireDispatchConfig(job: DispatchJob): HabllaDispatchConfig {
    if (!job.dispatchConfig) {
        throw new Error(`Dispatch job ${job.id} has no dispatch config`);
    }

    return job.dispatchConfig;
}

/**
 * The expected audience size, set when the job entered `awaitingAudience`.
 *
 * @throws Error when absent.
 */
export function requireAudienceSize(job: DispatchJob): number {
    if (job.audienceSize === undefined) {
        throw new Error(`Dispatch job ${job.id} has no audience size`);
    }

    return job.audienceSize;
}

/**
 * The audience deadline, set when the job entered or resumed `awaitingAudience`.
 *
 * @throws Error when absent.
 */
export function requireAudienceDeadline(job: DispatchJob): number {
    if (job.audienceDeadlineAt === undefined) {
        throw new Error(`Dispatch job ${job.id} has no audience deadline`);
    }

    return job.audienceDeadlineAt;
}
