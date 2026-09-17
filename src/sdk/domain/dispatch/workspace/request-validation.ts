/**
 * Fail-fast validation of a {@link WorkspaceDispatchRequest}. The shape checks need no
 * network and run before any call; the reference checks run against the roster and the
 * custom-field catalog. Every problem is reported at once.
 */

import type { CustomFieldDefinition, RosterUser } from './payloads';
import type { WorkspaceDispatchRequest } from './types';
import { normalizeEmail } from '../../../utils';
import { DispatchValidationError } from './errors';
import { isJobId } from './job-id';

/** Hablla object id: 24 lowercase hex digits. */
const HABLLA_ID_PATTERN = /^[0-9a-f]{24}$/;

/** Custom-field target of person fields. */
const PERSON_TARGET = 'person';

/** Custom-field type the first-name field must have. */
const FIRST_NAME_FIELD_TYPE = 'string';

/** Workspace users indexed for advisor resolution. */
export interface RosterIndex {
    byId: ReadonlyMap<string, RosterUser>;
    /** Keyed by normalized email. */
    byEmail: ReadonlyMap<string, RosterUser>;
}

/** Custom-field catalog by id. */
export type CustomFieldIndex = ReadonlyMap<string, CustomFieldDefinition>;

/**
 * Indexes the roster by id and by normalized email.
 *
 * @throws DispatchValidationError when two users share a normalized email, since an
 *   advisor email could not be resolved to one user.
 */
export function indexRoster(users: readonly RosterUser[]): RosterIndex {
    const byId = new Map<string, RosterUser>();
    const byEmail = new Map<string, RosterUser>();
    const problems: string[] = [];

    for (const user of users) {
        const email = normalizeEmail(user.email);
        const sameEmail = byEmail.get(email);

        if (sameEmail && sameEmail.id !== user.id) {
            problems.push(`users ${sameEmail.id} and ${user.id} share the email ${email}`);
        }

        byId.set(user.id, user);
        byEmail.set(email, user);
    }

    if (problems.length > 0) {
        throw new DispatchValidationError(problems);
    }

    return { byId, byEmail };
}

/** Indexes the custom-field catalog by id. */
export function indexCustomFields(fields: readonly CustomFieldDefinition[]): CustomFieldIndex {
    return new Map(fields.map((field) => [field.id, field]));
}

/**
 * Validates what can be checked without the network.
 *
 * @throws DispatchValidationError listing every problem.
 */
export function assertValidRequestShape(request: WorkspaceDispatchRequest): void {
    throwWhenAny(requestShapeProblems(request));
}

/**
 * Validates the whole request, shape and references to the roster and custom fields.
 *
 * @throws DispatchValidationError listing every problem.
 */
export function assertValidRequest(request: WorkspaceDispatchRequest, roster: RosterIndex, customFields: CustomFieldIndex): void {
    throwWhenAny([...requestShapeProblems(request), ...referenceProblems(request, roster, customFields)]);
}

/** Throws when any problem was found. */
function throwWhenAny(problems: readonly string[]): void {
    if (problems.length > 0) {
        throw new DispatchValidationError(problems);
    }
}

/** Problems of ids, label, rows, pacing and exclusion. */
function requestShapeProblems(request: WorkspaceDispatchRequest): string[] {
    const problems: string[] = [];
    const requireHabllaId = (field: string, value: unknown): void => {
        if (typeof value !== 'string' || !HABLLA_ID_PATTERN.test(value)) {
            problems.push(`${field} must be a Hablla id, got ${JSON.stringify(value)}`);
        }
    };

    requireHabllaId('connectionId', request.connectionId);
    requireHabllaId('templateId', request.templateId);
    requireHabllaId('sectorId', request.sectorId);
    requireHabllaId('firstNameFieldId', request.firstNameFieldId);
    request.systemUserIds.forEach((userId, position) => requireHabllaId(`systemUserIds[${position}]`, userId));

    if (request.unresolvedAdvisorPolicy.kind === 'assignReserve') {
        requireHabllaId('unresolvedAdvisorPolicy.reserveOwnerId', request.unresolvedAdvisorPolicy.reserveOwnerId);
    }

    if (request.repeatOfJobId !== undefined && !isJobId(request.repeatOfJobId)) {
        problems.push(`repeatOfJobId must be a job id, got ${JSON.stringify(request.repeatOfJobId)}`);
    }

    if (typeof request.label !== 'string' || request.label.trim() === '') {
        problems.push('label must not be empty');
    }

    if (request.rows.length === 0) {
        problems.push('rows must hold at least one row');
    }

    problems.push(...rowProblems(request));
    problems.push(...pacingProblems(request));
    problems.push(...exclusionProblems(request));

    return problems;
}

/** Problems of each row's field types and of rows carrying the computed first name. */
function rowProblems(request: WorkspaceDispatchRequest): string[] {
    const problems: string[] = [];

    request.rows.forEach((row, index) => {
        for (const field of ['name', 'phone', 'advisorKey'] as const) {
            if (typeof row[field] !== 'string') {
                problems.push(`rows[${index}].${field} must be a string`);
            }
        }

        if (row.customFields === null || typeof row.customFields !== 'object') {
            problems.push(`rows[${index}].customFields must be an object`);
            return;
        }

        for (const [fieldId, value] of Object.entries(row.customFields)) {
            if (typeof value !== 'string') {
                problems.push(`rows[${index}].customFields.${fieldId} must be a string`);
            }
        }

        if (Object.prototype.hasOwnProperty.call(row.customFields, request.firstNameFieldId)) {
            problems.push(`rows[${index}].customFields must not set the first-name field ${request.firstNameFieldId}; it is computed from the name`);
        }
    });

    return problems;
}

/** Problems of the pacing integers. */
function pacingProblems(request: WorkspaceDispatchRequest): string[] {
    const problems: string[] = [];

    for (const field of ['batchSize', 'intervalSeconds'] as const) {
        const value = request.pacing[field];

        if (!Number.isInteger(value) || value < 1) {
            problems.push(`pacing.${field} must be an integer >= 1, got ${JSON.stringify(value)}`);
        }
    }

    return problems;
}

/**
 * Problems of the exclusion. A filter without a `type` is refused instead of travelling to
 * the report engine, which would answer a listing the operator did not ask for and send to
 * people who asked to be left out.
 */
function exclusionProblems(request: WorkspaceDispatchRequest): string[] {
    const problems: string[] = [];

    request.exclusion.segmentationFilters.forEach((filter, position) => {
        if (typeof filter?.type !== 'string' || filter.type.trim() === '') {
            problems.push(`exclusion.segmentationFilters[${position}].type must not be empty`);
        }
    });

    return problems;
}

/** Problems of references to users and custom fields. */
function referenceProblems(request: WorkspaceDispatchRequest, roster: RosterIndex, customFields: CustomFieldIndex): string[] {
    const problems: string[] = [];

    request.systemUserIds.forEach((userId, position) => {
        if (!roster.byId.has(userId)) {
            problems.push(`systemUserIds[${position}] ${userId} is not a workspace user`);
        }
    });

    if (request.unresolvedAdvisorPolicy.kind === 'assignReserve') {
        const reserveOwnerId = request.unresolvedAdvisorPolicy.reserveOwnerId;

        if (!roster.byId.has(reserveOwnerId)) {
            problems.push(`reserve owner ${reserveOwnerId} is not a workspace user`);
        }

        if (request.systemUserIds.includes(reserveOwnerId)) {
            problems.push(`reserve owner ${reserveOwnerId} must not be a system user`);
        }
    }

    const firstNameField = customFields.get(request.firstNameFieldId);

    if (!firstNameField) {
        problems.push(`first-name field ${request.firstNameFieldId} does not exist`);
    } else if (firstNameField.target !== PERSON_TARGET || firstNameField.type !== FIRST_NAME_FIELD_TYPE) {
        problems.push(`first-name field ${request.firstNameFieldId} must be a ${PERSON_TARGET} field of type ${FIRST_NAME_FIELD_TYPE}, got ${firstNameField.target}/${firstNameField.type}`);
    }

    for (const fieldId of rowCustomFieldIds(request)) {
        const field = customFields.get(fieldId);

        if (!field) {
            problems.push(`custom field ${fieldId} used by the rows does not exist`);
        } else if (field.target !== PERSON_TARGET) {
            problems.push(`custom field ${fieldId} used by the rows is not a ${PERSON_TARGET} field`);
        }
    }

    return problems;
}

/** Distinct custom-field ids across every row. */
function rowCustomFieldIds(request: WorkspaceDispatchRequest): Set<string> {
    const ids = new Set<string>();

    for (const row of request.rows) {
        if (row.customFields !== null && typeof row.customFields === 'object') {
            Object.keys(row.customFields).forEach((fieldId) => ids.add(fieldId));
        }
    }

    return ids;
}
