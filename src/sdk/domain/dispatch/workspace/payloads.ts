/**
 * Strict parsers of the Hablla payloads the workspace dispatch reads, written against
 * the captured fixtures in `__fixtures__`. A missing or mistyped required field throws
 * {@link UnexpectedPayloadError} naming the item; nothing is guessed or defaulted.
 */

import type { PersonSnapshot } from './owner-policy';
import { toDigits } from '../../../utils';
import { UnexpectedPayloadError } from './errors';

/** A person's id and stored phones, the part both person listings (v1 and v2) share. */
export interface PersonIdentity {
    id: string;
    /** Stored phone digits. */
    phones: readonly string[];
}

/** One attendance (service) as far as the open-attendance check needs. */
export interface AttendanceStatus {
    id: string;
    status: string;
}

/** A workspace user; `id` is the user id persons reference in `users`. */
export interface RosterUser {
    id: string;
    email: string;
    name: string;
}

/** A custom field as far as validation needs. */
export interface CustomFieldDefinition {
    id: string;
    target: string;
    type: string;
}

/** One membership of a person in a segmentation. */
export interface SegmentationItem {
    id: string;
    person: string;
}

/** A campaign as far as reconciliation needs. */
export interface CampaignSummary {
    id: string;
    name: string;
    quantity: number;
}

/** A page of a paginated listing. */
export interface PayloadPage {
    results: readonly unknown[];
    totalPages: number;
}

type PayloadRecord = Readonly<Record<string, unknown>>;

/** Reads a paginated listing (`results` array plus `totalPages`). */
export function toPayloadPage(data: unknown, payload: string): PayloadPage {
    const page = requireRecord(data, payload, 'page');

    return {
        results: requireArray(page, 'results', payload, 'page'),
        totalPages: requireNumber(page, 'totalPages', payload, 'page'),
    };
}

/** Reads the id of a created resource. */
export function toCreatedId(data: unknown, payload: string): string {
    return requireString(requireRecord(data, payload, 'response'), 'id', payload, 'response');
}

/** Reads a person from the v1 listing (no `is_blocked`). */
export function toPersonIdentity(raw: unknown): PersonIdentity {
    const person = requireRecord(raw, 'person', 'item');
    const id = requireString(person, 'id', 'person', 'item');
    const phones = requireArray(person, 'phones', 'person', id)
        .map((entry) => toDigits(requireString(requireRecord(entry, 'person', id), 'phone', 'person', id)));

    return { id, phones };
}

/** Reads a person from the v2 search, with blocking, owners and followers. */
export function toPersonSnapshot(raw: unknown): PersonSnapshot {
    const identity = toPersonIdentity(raw);
    const person = raw as PayloadRecord;

    return {
        ...identity,
        isBlocked: requireBoolean(person, 'is_blocked', 'person', identity.id),
        ownerIds: requireStringArray(person, 'users', 'person', identity.id),
        followerIds: requireStringArray(person, 'followers', 'person', identity.id),
    };
}

/** Reads an attendance's id and status. */
export function toAttendanceStatus(raw: unknown): AttendanceStatus {
    const service = requireRecord(raw, 'service', 'item');
    const id = requireString(service, 'id', 'service', 'item');

    return { id, status: requireString(service, 'status', 'service', id) };
}

/** Reads a roster entry; the user id and email live in the nested `user`. */
export function toRosterUser(raw: unknown): RosterUser {
    const entry = requireRecord(raw, 'user', 'item');
    const user = requireRecord(entry.user, 'user', 'item');
    const id = requireString(user, 'id', 'user', 'item');

    return {
        id,
        email: requireString(user, 'email', 'user', id),
        name: requireString(user, 'name', 'user', id),
    };
}

/** Reads a custom field's id, target and type. */
export function toCustomFieldDefinition(raw: unknown): CustomFieldDefinition {
    const field = requireRecord(raw, 'custom field', 'item');
    const id = requireString(field, 'id', 'custom field', 'item');

    return {
        id,
        target: requireString(field, 'target', 'custom field', id),
        type: requireString(field, 'type', 'custom field', id),
    };
}

/** Reads a segmentation item's id and person. */
export function toSegmentationItem(raw: unknown): SegmentationItem {
    const item = requireRecord(raw, 'segmentation item', 'item');
    const id = requireString(item, 'id', 'segmentation item', 'item');

    return { id, person: requireString(item, 'person', 'segmentation item', id) };
}

/** Reads a campaign's id, name and resolved audience quantity. */
export function toCampaignSummary(raw: unknown): CampaignSummary {
    const campaign = requireRecord(raw, 'campaign', 'item');
    const id = requireString(campaign, 'id', 'campaign', 'item');

    return {
        id,
        name: requireString(campaign, 'name', 'campaign', id),
        quantity: requireNumber(campaign, 'quantity', 'campaign', id),
    };
}

/** The value as a plain object, or a payload error. */
function requireRecord(value: unknown, payload: string, item: string): PayloadRecord {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new UnexpectedPayloadError(payload, `${item} is not an object`);
    }

    return value as PayloadRecord;
}

/** A required string field. */
function requireString(record: PayloadRecord, field: string, payload: string, item: string): string {
    const value = record[field];

    if (typeof value !== 'string') {
        throw new UnexpectedPayloadError(payload, `${item}: field ${field} is not a string`);
    }

    return value;
}

/** A required finite number field. */
function requireNumber(record: PayloadRecord, field: string, payload: string, item: string): number {
    const value = record[field];

    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new UnexpectedPayloadError(payload, `${item}: field ${field} is not a number`);
    }

    return value;
}

/** A required boolean field. */
function requireBoolean(record: PayloadRecord, field: string, payload: string, item: string): boolean {
    const value = record[field];

    if (typeof value !== 'boolean') {
        throw new UnexpectedPayloadError(payload, `${item}: field ${field} is not a boolean`);
    }

    return value;
}

/** A required array field. */
function requireArray(record: PayloadRecord, field: string, payload: string, item: string): readonly unknown[] {
    const value = record[field];

    if (!Array.isArray(value)) {
        throw new UnexpectedPayloadError(payload, `${item}: field ${field} is not an array`);
    }

    return value;
}

/** A required array-of-strings field. */
function requireStringArray(record: PayloadRecord, field: string, payload: string, item: string): readonly string[] {
    const values = requireArray(record, field, payload, item);

    if (!values.every((value) => typeof value === 'string')) {
        throw new UnexpectedPayloadError(payload, `${item}: field ${field} holds a non-string entry`);
    }

    return values as readonly string[];
}
