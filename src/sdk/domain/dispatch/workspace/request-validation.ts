/**
 * Fail-fast validation of a {@link WorkspaceDispatchRequest}. The shape checks need no
 * network and run before any call; the reference checks run against the roster and the
 * custom-field catalog. Every problem is reported at once.
 */

import type { CustomFieldDefinition, RosterUser } from './payloads';
import type { TemplateVariable } from './template-variables';
import type { WorkspaceDispatchRequest } from './types';
import { normalizeEmail } from '../../../utils';
import { DispatchValidationError } from './errors';
import { isJobId } from './job-id';
import { VARIABLE_FORMATS, boundFieldIds } from './template-variables';

/** Hablla object id: 24 lowercase hex digits. */
const HABLLA_ID_PATTERN = /^[0-9a-f]{24}$/;

/** Custom-field target of person fields. */
const PERSON_TARGET = 'person';

/** Custom-field type a person field bound to a template variable must have. */
const VARIABLE_FIELD_TYPE = 'string';

/** The policies of a request and the values each one accepts. */
const POLICY_VALUES = {
    systemOwnerPolicy: ['replace', 'add'],
    humanOwnerPolicy: ['keep', 'replace'],
    existingPersonFieldPolicy: ['updateSentFields', 'none'],
} as const;

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

/** Problems of ids, label, policies, template variables, rows, pacing and exclusion. */
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
    request.systemUserIds.forEach((userId, position) => requireHabllaId(`systemUserIds[${position}]`, userId));
    problems.push(...policyProblems(request));

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

    problems.push(...templateVariableProblems(request));
    problems.push(...fieldPolicyProblems(request));
    problems.push(...rowProblems(request));
    problems.push(...pacingProblems(request));
    problems.push(...exclusionProblems(request));

    return problems;
}

/** Problems of the policies, each one an enumeration the untyped caller may get wrong. */
function policyProblems(request: WorkspaceDispatchRequest): string[] {
    return Object.entries(POLICY_VALUES)
        .filter(([policy, values]) => !(values as readonly string[]).includes(request[policy as keyof typeof POLICY_VALUES]))
        .map(([policy, values]) => `${policy} must be one of ${values.join(', ')}, got ${JSON.stringify(request[policy as keyof typeof POLICY_VALUES])}`);
}

/**
 * Problems of the template variables: a variable with no origin, a person field that is
 * not a Hablla id, a literal that is not text, an unknown or repeated reformatting step,
 * and two variables bound to the same custom field, which would make the value written for
 * one of them depend on which was applied last.
 */
function templateVariableProblems(request: WorkspaceDispatchRequest): string[] {
    if (!Array.isArray(request.templateVariables)) {
        return ['templateVariables must be an array, one entry per body variable of the template'];
    }

    const problems = request.templateVariables.flatMap((variable, position) => variableProblems(variable, position));
    const bound = request.templateVariables.filter((variable) => variable?.kind === 'personField');

    if (boundFieldIds(bound).length !== bound.length) {
        problems.push('templateVariables must not bind the same custom field twice');
    }

    return problems;
}

/**
 * Problem of the two options that cannot hold at once: a variable that reads a person
 * field while the policy writes nothing into a person that already exists. The campaign
 * would send `{{person.custom_fields.<id>}}` for someone whose field the row's value never
 * reaches, so the message goes out with that variable empty or carrying a value from an
 * earlier dispatch. The operator chooses `updateSentFields` or a literal variable.
 */
function fieldPolicyProblems(request: WorkspaceDispatchRequest): string[] {
    if (request.existingPersonFieldPolicy !== 'none' || !Array.isArray(request.templateVariables)) {
        return [];
    }

    const bound = boundFieldIds(request.templateVariables.filter((variable) => variable?.kind === 'personField'));

    if (bound.length === 0) {
        return [];
    }

    return [`templateVariables read the custom fields ${bound.join(', ')} from each person, which existingPersonFieldPolicy 'none' never writes into a person that already exists: choose 'updateSentFields' or a literal variable`];
}

/** Problems of one template variable. */
function variableProblems(variable: TemplateVariable, position: number): string[] {
    const at = `templateVariables[${position}]`;

    if (variable?.kind === 'personField') {
        const fieldProblems = HABLLA_ID_PATTERN.test(String(variable.fieldId)) ? [] : [`${at}.fieldId must be a Hablla id, got ${JSON.stringify(variable.fieldId)}`];

        return [...fieldProblems, ...formatProblems(variable, at)];
    }

    if (variable?.kind === 'literal') {
        const valueProblems = typeof variable.value === 'string' ? [] : [`${at}.value must be a string`];

        return [...valueProblems, ...formatProblems(variable, at)];
    }

    return [`${at} must say where its value comes from, personField or literal, got ${JSON.stringify((variable as { kind?: unknown })?.kind)}`];
}

/** Problems of a variable's reformatting steps. */
function formatProblems(variable: TemplateVariable, at: string): string[] {
    if (!Array.isArray(variable.formats)) {
        return [`${at}.formats must be an array of reformatting steps; an empty one sends the value as it came`];
    }

    const unknown = variable.formats.filter((format) => !(VARIABLE_FORMATS as readonly string[]).includes(format));
    const repeated = variable.formats.length !== new Set(variable.formats).size;

    return [
        ...unknown.map((format) => `${at}.formats holds ${JSON.stringify(format)}, which is not one of ${VARIABLE_FORMATS.join(', ')}`),
        ...(repeated ? [`${at}.formats must not repeat a step`] : []),
    ];
}

/** Problems of each row's field types. */
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

    problems.push(...boundFieldProblems(request, customFields));

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

/**
 * Problems of the custom fields the template variables bind: a field the workspace does
 * not have or that cannot carry text, and a field the audience does not fill — the column
 * the operator mapped the variable to is not there, so the message would go out with a hole.
 * A `templateVariables` that is not a list was already reported by the shape check.
 */
function boundFieldProblems(request: WorkspaceDispatchRequest, customFields: CustomFieldIndex): string[] {
    if (!Array.isArray(request.templateVariables)) {
        return [];
    }

    const problems: string[] = [];

    for (const fieldId of boundFieldIds(request.templateVariables)) {
        const field = customFields.get(fieldId);

        if (!field) {
            problems.push(`custom field ${fieldId} bound by a template variable does not exist`);
        } else if (field.target !== PERSON_TARGET || field.type !== VARIABLE_FIELD_TYPE) {
            problems.push(`custom field ${fieldId} bound by a template variable must be a ${PERSON_TARGET} field of type ${VARIABLE_FIELD_TYPE}, got ${field.target}/${field.type}`);
        }

        const unfilled = request.rows.filter((row) => !Object.prototype.hasOwnProperty.call(row.customFields ?? {}, fieldId)).length;

        if (unfilled > 0) {
            problems.push(`custom field ${fieldId} bound by a template variable is not filled by ${unfilled} of the ${request.rows.length} rows`);
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
