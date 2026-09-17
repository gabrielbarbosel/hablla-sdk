/**
 * Accessors for contact fields that the planning guarantees at a given step. A missing
 * field there is a planning bug, so it throws instead of being defaulted.
 */

import type { PhoneVariants } from '../../../utils';
import type { DispatchContact, OwnerChange, ResolvedPerson, TargetOwner } from './types';

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
