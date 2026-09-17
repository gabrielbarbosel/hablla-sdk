import { describe, it, expect } from 'vitest';
import { assertValidRequest, assertValidRequestShape, indexCustomFields, indexRoster, JOB_ID_PATTERN } from './request-validation';
import { DispatchValidationError } from './errors';
import { toCustomFieldDefinition } from './payloads';
import customFieldsPage from './__fixtures__/custom-fields-page.json';
import {
    ADVISOR,
    BOARD_FIELD_ID,
    FIRST_NAME_FIELD_ID,
    RESERVE_OWNER,
    ROSTER,
    SYSTEM_USER,
    ZENVIA_IDS_FIELD_ID,
    aRequest,
    aRow,
    habllaId,
} from './__fixtures__/builders';
import type { WorkspaceDispatchRequest } from './types';

const CUSTOM_FIELDS = indexCustomFields(customFieldsPage.results.map(toCustomFieldDefinition));

/** The problems a request raises, or [] when it is valid. */
function problemsOf(request: WorkspaceDispatchRequest, customFields = CUSTOM_FIELDS): readonly string[] {
    try {
        assertValidRequest(request, ROSTER, customFields);
        return [];
    } catch (error) {
        if (error instanceof DispatchValidationError) {
            return error.problems;
        }
        throw error;
    }
}

describe('assertValidRequest', () => {
    it('accepts a valid request', () => {
        expect(problemsOf(aRequest({ rows: [aRow('1', { customFields: { [ZENVIA_IDS_FIELD_ID]: '123' } })] }))).toEqual([]);
    });

    it.each([
        ['connectionId', { connectionId: 'conn' }],
        ['templateId', { templateId: '' }],
        ['sectorId', { sectorId: 'ABCDEF0123456789ABCDEF01' }],
        ['firstNameFieldId', { firstNameFieldId: 'x' }],
        ['systemUserIds[0]', { systemUserIds: ['martech'] }],
        ['reserveOwnerId', { unresolvedAdvisorPolicy: { kind: 'assignReserve', reserveOwnerId: 'reserve' } }],
        ['repeatOfJobId', { repeatOfJobId: 'job-1' }],
        ['label', { label: '  ' }],
        ['rows', { rows: [] }],
        ['pacing.batchSize', { pacing: { batchSize: 0, intervalSeconds: 10 } }],
        ['pacing.intervalSeconds', { pacing: { batchSize: 5, intervalSeconds: 2.5 } }],
    ] as Array<[string, Partial<WorkspaceDispatchRequest>]>)('reports an invalid %s', (field, overrides) => {
        expect(problemsOf(aRequest(overrides)).some((problem) => problem.includes(field))).toBe(true);
    });

    it('accepts a well-formed repeatOfJobId', () => {
        const jobId = `0123456789abcdef-3-${Date.UTC(2026, 8, 17).toString(36)}`;

        expect(JOB_ID_PATTERN.test(jobId)).toBe(true);
        expect(problemsOf(aRequest({ repeatOfJobId: jobId }))).toEqual([]);
    });

    it('reports several problems in one error', () => {
        expect(problemsOf(aRequest({ label: '', connectionId: 'x', pacing: { batchSize: 0, intervalSeconds: 0 } }))).toHaveLength(4);
    });

    it('reports a system user or a reserve owner that is not a workspace user', () => {
        const problems = problemsOf(aRequest({
            systemUserIds: [habllaId('dead')],
            unresolvedAdvisorPolicy: { kind: 'assignReserve', reserveOwnerId: habllaId('beef') },
        }));

        expect(problems).toEqual([
            `systemUserIds[0] ${habllaId('dead')} is not a workspace user`,
            `reserve owner ${habllaId('beef')} is not a workspace user`,
        ]);
    });

    it('reports a reserve owner that is a system user', () => {
        expect(problemsOf(aRequest({ unresolvedAdvisorPolicy: { kind: 'assignReserve', reserveOwnerId: SYSTEM_USER.id } }))).toEqual([
            `reserve owner ${SYSTEM_USER.id} must not be a system user`,
        ]);
    });

    it('needs no reserve owner under the skip policy', () => {
        expect(problemsOf(aRequest({ unresolvedAdvisorPolicy: { kind: 'skip' } }))).toEqual([]);
    });

    it('reports a first-name field that does not exist', () => {
        expect(problemsOf(aRequest({ firstNameFieldId: habllaId('f00d') }))).toEqual([`first-name field ${habllaId('f00d')} does not exist`]);
    });

    it('reports a first-name field with the wrong target or type', () => {
        const numberField = new Map(CUSTOM_FIELDS).set(FIRST_NAME_FIELD_ID, { id: FIRST_NAME_FIELD_ID, target: 'person', type: 'number' });

        expect(problemsOf(aRequest({ firstNameFieldId: BOARD_FIELD_ID }))[0]).toMatch(/must be a person field of type string, got board\/string/);
        expect(problemsOf(aRequest(), numberField)[0]).toMatch(/got person\/number/);
    });

    it('reports a row custom field that does not exist or is not a person field', () => {
        const problems = problemsOf(aRequest({ rows: [aRow('1', { customFields: { [habllaId('bad')]: 'x', [BOARD_FIELD_ID]: 'y' } })] }));

        expect(problems).toEqual([
            `custom field ${habllaId('bad')} used by the rows does not exist`,
            `custom field ${BOARD_FIELD_ID} used by the rows is not a person field`,
        ]);
    });

    it('reports rows that set the first-name field themselves', () => {
        expect(problemsOf(aRequest({ rows: [aRow('1', { customFields: { [FIRST_NAME_FIELD_ID]: 'Ana' } })] }))[0]).toMatch(/rows\[0\]\.customFields must not set the first-name field/);
    });

    it('reports a filter exclusion with an empty type, and refuses filter exclusions until they are supported', () => {
        const problems = problemsOf(aRequest({ exclusion: { phones: [], segmentationFilters: [{ type: '' }] } }));

        expect(problems).toEqual([
            'exclusion.segmentationFilters[0].type must not be empty',
            'exclusion.segmentationFilters is not supported yet: exclude by explicit phones',
        ]);
    });
});

describe('assertValidRequestShape', () => {
    it('checks the shape without roster or custom fields', () => {
        expect(() => assertValidRequestShape(aRequest({ exclusion: { phones: [], segmentationFilters: [{ type: '' }] } }))).toThrow(DispatchValidationError);
        expect(() => assertValidRequestShape(aRequest({ firstNameFieldId: habllaId('f00d') }))).not.toThrow();
    });
});

describe('indexRoster', () => {
    it('indexes by id and by normalized email', () => {
        const roster = indexRoster([{ ...ADVISOR, email: ' Advisor.One@Example.com ' }, RESERVE_OWNER]);

        expect(roster.byEmail.get('advisor.one@example.com')?.id).toBe(ADVISOR.id);
        expect(roster.byId.get(RESERVE_OWNER.id)).toEqual(RESERVE_OWNER);
    });

    it('rejects two users sharing a normalized email', () => {
        expect(() => indexRoster([ADVISOR, { ...RESERVE_OWNER, email: 'ADVISOR.ONE@example.com' }])).toThrow(DispatchValidationError);
    });
});
