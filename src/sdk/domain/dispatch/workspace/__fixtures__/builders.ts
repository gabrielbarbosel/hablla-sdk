/**
 * Test builders for the workspace dispatch: requests, rosters, contacts and call results
 * shaped like the captured fixtures. Test-only; excluded from the build.
 */

import type { CallResult } from '../../../../core/call-executor';
import type { RosterUser } from '../payloads';
import type { TemplateVariable } from '../template-variables';
import type { DispatchContact, DispatchSettings, WorkspaceDispatchRequest, WorkspaceDispatchRow } from '../types';
import { indexRoster } from '../request-validation';
import personsV2Page from './persons-v2-by-phone.json';

/** A deterministic 24-hex Hablla id ending in `suffix`. */
export function habllaId(suffix: number | string): string {
    return String(suffix).padStart(24, '0');
}

export const CONNECTION_ID = '6a04dd9c263b426122d2f2f1';
export const TEMPLATE_ID = '6a2c48c482bdc5b6adc12977';
export const SECTOR_ID = '6a04db499e34f608ab321c1f';
export const FIRST_NAME_FIELD_ID = '6a58642a4d7c0aa11db4d93e';
export const ZENVIA_IDS_FIELD_ID = '6a1d1767b0109bf5a815b940';
export const BOARD_FIELD_ID = '6a5e729a6ec9b877164073f1';
export const ADVISOR = { id: habllaId('a1'), email: 'advisor.one@example.com', name: 'Advisor One' } satisfies RosterUser;
export const OTHER_ADVISOR = { id: habllaId('a2'), email: 'advisor.two@example.com', name: 'Advisor Two' } satisfies RosterUser;
export const SYSTEM_USER = { id: habllaId('5a'), email: 'martech@example.com', name: 'Martech' } satisfies RosterUser;
export const RESERVE_OWNER = { id: habllaId('7e'), email: 'reserve@example.com', name: 'Reserve' } satisfies RosterUser;
export const ROSTER_USERS: readonly RosterUser[] = [ADVISOR, OTHER_ADVISOR, SYSTEM_USER, RESERVE_OWNER];
export const ROSTER = indexRoster(ROSTER_USERS);

/** The one body variable of the fixture template: the audience's name column, reformatted to a capitalized first name. */
export const NAME_VARIABLE: TemplateVariable = { kind: 'personField', fieldId: FIRST_NAME_FIELD_ID, formats: ['firstName', 'capitalize'] };

/**
 * A row for the advisor, with a valid mobile phone ending in `phoneSuffix`. Its name
 * column is also mapped to the first-name custom field, the way the app maps the column
 * behind {@link NAME_VARIABLE}.
 */
export function aRow(phoneSuffix: string, overrides: Partial<WorkspaceDispatchRow> = {}): WorkspaceDispatchRow {
    const row = {
        name: 'ana paula souza',
        phone: `51999${phoneSuffix.padStart(6, '0')}`,
        advisorKey: ADVISOR.email,
        ...overrides,
    };

    return { ...row, customFields: overrides.customFields ?? { [FIRST_NAME_FIELD_ID]: row.name } };
}

/** A valid request with the given rows. */
export function aRequest(overrides: Partial<WorkspaceDispatchRequest> = {}): WorkspaceDispatchRequest {
    return {
        label: 'Campanha setembro',
        connectionId: CONNECTION_ID,
        templateId: TEMPLATE_ID,
        templateVariables: [NAME_VARIABLE],
        sectorId: SECTOR_ID,
        advisorKeyKind: 'email',
        systemUserIds: [SYSTEM_USER.id],
        systemOwnerPolicy: 'replace',
        humanOwnerPolicy: 'keep',
        existingPersonFieldPolicy: 'updateSentFields',
        unresolvedAdvisorPolicy: { kind: 'assignReserve', reserveOwnerId: RESERVE_OWNER.id },
        exclusion: { phones: [], segmentationFilters: [] },
        pacing: { batchSize: 5, intervalSeconds: 10 },
        rows: [aRow('000001')],
        ...overrides,
    };
}

/** The persisted settings of a request. */
export function settingsOf(request: WorkspaceDispatchRequest): DispatchSettings {
    const { rows: _rows, exclusion: _exclusion, ...settings } = request;
    return settings;
}

/** A contact waiting for its lookup, with the phone `5551999000001`. */
export function aContact(overrides: Partial<DispatchContact> = {}): DispatchContact {
    return {
        index: 0,
        name: 'ana paula souza',
        phone: { digits: '5551999000001', alternate: '555199000001' },
        advisorResolution: 'matched',
        target: { userId: ADVISOR.id, source: 'advisor' },
        customFields: { [FIRST_NAME_FIELD_ID]: 'Ana' },
        outcome: 'pendingLookup',
        writesDone: 0,
        attempts: 0,
        createSends: 0,
        ...overrides,
    };
}

/** A completed result. */
export function completed(status: number, data: unknown = {}): CallResult {
    return { kind: 'completed', status, data };
}

/** A paginated payload holding `results`. */
export function page(results: readonly unknown[], totalPages = 1): Record<string, unknown> {
    return { results, count: results.length, totalItems: results.length, page: 1, limit: 50, totalPages };
}

/** A v2 person item (captured shape) with the given id, phone, owners and followers. */
export function personItem(fields: { id: string; phone: string; users?: string[]; followers?: string[]; isBlocked?: boolean }): Record<string, unknown> {
    const [captured] = personsV2Page.results;

    return {
        ...captured,
        id: fields.id,
        phones: [{ type: 'personal', phone: fields.phone, is_whatsapp: true }],
        users: fields.users ?? [],
        followers: fields.followers ?? [],
        is_blocked: fields.isBlocked ?? false,
    };
}

/** An attendance item with the given status. */
export function attendanceItem(id: string, status: string): Record<string, unknown> {
    return { id, status, key: `${CONNECTION_ID}_5551999000001` };
}
