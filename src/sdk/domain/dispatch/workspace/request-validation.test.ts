import { describe, it, expect } from 'vitest';
import { assertValidRequest, assertValidRequestShape, indexCustomFields, indexRoster } from './request-validation';
import { isJobId } from './job-id';
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
        const row = aRow('1', { customFields: { [FIRST_NAME_FIELD_ID]: 'ana', [ZENVIA_IDS_FIELD_ID]: '123' } });

        expect(problemsOf(aRequest({ rows: [row] }))).toEqual([]);
    });

    it('accepts a template without variables', () => {
        expect(problemsOf(aRequest({ templateVariables: [] }))).toEqual([]);
    });

    it.each([
        ['connectionId', { connectionId: 'conn' }],
        ['templateId', { templateId: '' }],
        ['sectorId', { sectorId: 'ABCDEF0123456789ABCDEF01' }],
        ['systemUserIds[0]', { systemUserIds: ['martech'] }],
        ['reserveOwnerId', { unresolvedAdvisorPolicy: { kind: 'assignReserve', reserveOwnerId: 'reserve' } }],
        ['repeatOfJobId', { repeatOfJobId: 'job-1' }],
        ['label', { label: '  ' }],
        ['rows', { rows: [] }],
        ['pacing.batchSize', { pacing: { batchSize: 0, intervalSeconds: 10 } }],
        ['pacing.intervalSeconds', { pacing: { batchSize: 5, intervalSeconds: 2.5 } }],
        ['systemOwnerPolicy', { systemOwnerPolicy: 'keep' as never }],
        ['humanOwnerPolicy', { humanOwnerPolicy: 'add' as never }],
        ['existingPersonFieldPolicy', { existingPersonFieldPolicy: 'all' as never }],
    ] as Array<[string, Partial<WorkspaceDispatchRequest>]>)('reports an invalid %s', (field, overrides) => {
        expect(problemsOf(aRequest(overrides)).some((problem) => problem.includes(field))).toBe(true);
    });

    it('accepts a well-formed repeatOfJobId', () => {
        const jobId = `0123456789abcdef-3-${Date.UTC(2026, 8, 17).toString(36)}`;

        expect(isJobId(jobId)).toBe(true);
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

    it('reports a bound custom field that does not exist', () => {
        const request = aRequest({
            templateVariables: [{ kind: 'personField', fieldId: habllaId('f00d'), formats: [] }],
            rows: [aRow('1', { customFields: { [habllaId('f00d')]: 'ana' } })],
        });

        expect(problemsOf(request)).toEqual([
            `custom field ${habllaId('f00d')} bound by a template variable does not exist`,
            `custom field ${habllaId('f00d')} used by the rows does not exist`,
        ]);
    });

    it('reports a bound custom field with the wrong target or type', () => {
        const numberField = new Map(CUSTOM_FIELDS).set(FIRST_NAME_FIELD_ID, { id: FIRST_NAME_FIELD_ID, target: 'person', type: 'number' });
        const boardRequest = aRequest({
            templateVariables: [{ kind: 'personField', fieldId: BOARD_FIELD_ID, formats: [] }],
            rows: [aRow('1', { customFields: { [BOARD_FIELD_ID]: 'ana' } })],
        });

        expect(problemsOf(boardRequest)[0]).toMatch(/must be a person field of type string, got board\/string/);
        expect(problemsOf(aRequest(), numberField)[0]).toMatch(/got person\/number/);
    });

    it('reports a bound custom field the audience does not fill, naming how many rows lack it', () => {
        const request = aRequest({ rows: [aRow('1', { customFields: {} }), aRow('2')] });

        expect(problemsOf(request)).toEqual([
            `custom field ${FIRST_NAME_FIELD_ID} bound by a template variable is not filled by 1 of the 2 rows`,
        ]);
    });

    it('reports a templateVariables that is not a list, without crashing on the reference checks', () => {
        expect(problemsOf(aRequest({ templateVariables: undefined as never }))).toEqual([
            'templateVariables must be an array, one entry per body variable of the template',
        ]);
    });

    it('reports a variable that does not say where its value comes from', () => {
        const problems = problemsOf(aRequest({ templateVariables: [{ fieldId: FIRST_NAME_FIELD_ID, formats: [] } as never] }));

        expect(problems[0]).toMatch(/templateVariables\[0\] must say where its value comes from, personField or literal/);
    });

    it('reports a person-field variable without a Hablla id and a literal without text', () => {
        const problems = problemsOf(aRequest({
            templateVariables: [
                { kind: 'personField', fieldId: 'coluna B', formats: [] },
                { kind: 'literal', value: 42 as never, formats: [] },
            ],
        }));

        expect(problems.slice(0, 2)).toEqual([
            'templateVariables[0].fieldId must be a Hablla id, got "coluna B"',
            'templateVariables[1].value must be a string',
        ]);
    });

    it('reports an unknown or repeated reformatting step', () => {
        const problems = problemsOf(aRequest({
            templateVariables: [
                { kind: 'literal', value: 'ana', formats: ['titleCase' as never] },
                { kind: 'literal', value: 'ana', formats: ['capitalize', 'capitalize'] },
            ],
        }));

        expect(problems).toEqual([
            'templateVariables[0].formats holds "titleCase", which is not one of firstName, capitalize, upperCase',
            'templateVariables[1].formats must not repeat a step',
        ]);
    });

    it('reports two variables bound to the same custom field', () => {
        const problems = problemsOf(aRequest({
            templateVariables: [
                { kind: 'personField', fieldId: FIRST_NAME_FIELD_ID, formats: [] },
                { kind: 'personField', fieldId: FIRST_NAME_FIELD_ID, formats: ['upperCase'] },
            ],
        }));

        expect(problems).toEqual(['templateVariables must not bind the same custom field twice']);
    });

    it('reports a row custom field that does not exist or is not a person field', () => {
        const row = aRow('1', { customFields: { [FIRST_NAME_FIELD_ID]: 'ana', [habllaId('bad')]: 'x', [BOARD_FIELD_ID]: 'y' } });
        const problems = problemsOf(aRequest({ rows: [row] }));

        expect(problems).toEqual([
            `custom field ${habllaId('bad')} used by the rows does not exist`,
            `custom field ${BOARD_FIELD_ID} used by the rows is not a person field`,
        ]);
    });

    it('reports a filter exclusion with an empty type and accepts one with a type', () => {
        expect(problemsOf(aRequest({ exclusion: { phones: [], segmentationFilters: [{ type: '' }] } }))).toEqual([
            'exclusion.segmentationFilters[0].type must not be empty',
        ]);
        expect(problemsOf(aRequest({ exclusion: { phones: [], segmentationFilters: [{ type: 'in_segmentation', segmentation: habllaId('5eg') }] } }))).toEqual([]);
    });
});

describe('assertValidRequestShape', () => {
    it('checks the shape without roster or custom fields', () => {
        expect(() => assertValidRequestShape(aRequest({ exclusion: { phones: [], segmentationFilters: [{ type: '' }] } }))).toThrow(DispatchValidationError);
        expect(() => assertValidRequestShape(aRequest({ templateVariables: [{ kind: 'personField', fieldId: habllaId('f00d'), formats: [] }] }))).not.toThrow();
        expect(() => assertValidRequestShape(aRequest({ templateVariables: [{ kind: 'personField', fieldId: 'coluna B', formats: [] }] }))).toThrow(DispatchValidationError);
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
