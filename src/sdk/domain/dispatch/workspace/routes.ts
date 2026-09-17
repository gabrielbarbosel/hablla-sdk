/**
 * Every Hablla route the workspace dispatch calls, as {@link HttpCall} builders with a
 * literal auth strategy. The only module that knows paths: nothing here can fall into
 * the http-client's workspace-to-Bearer retry, and O(N) routes are pinned to the
 * workspace token while Bearer is reserved for the O(1) routes that only accept it.
 */

import type { HttpCall } from '../../../core/call-executor';
import type { CampaignCreateBody, PersonCreateBody, PersonUpdateBody, SegmentationCreateBody, SegmentationFilter } from './types';
import {
    ATTENDANCE_LOOKUP_LIMIT,
    CAMPAIGN_RECONCILE_PAGE_LIMIT,
    CATALOG_PAGE_LIMIT,
    OPEN_ATTENDANCE_STATUSES,
    PERSON_LOOKUP_LIMIT,
    SEGMENTATION_ITEM_LOOKUP_LIMIT,
} from './constants';

const PERSONS_V1 = '/v1/workspaces/{workspace_id}/persons';
const PERSONS_V2 = '/v2/workspaces/{workspace_id}/persons';
const PERSON_V1 = '/v1/workspaces/{workspace_id}/persons/{person_id}';
const SEGMENTATIONS = '/v1/workspaces/{workspace_id}/segmentations';
const SEGMENTATION_ITEMS = '/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items';

/** One page of the workspace user roster (workspace). */
export function listUsersPage(page: number): HttpCall {
    return { method: 'GET', rawPath: '/v1/workspaces/{workspace_id}/users', query: { limit: CATALOG_PAGE_LIMIT, page }, strategy: 'workspace' };
}

/** One page of the custom-field catalog (Bearer only). */
export function listCustomFieldsPage(page: number): HttpCall {
    return { method: 'GET', rawPath: '/v1/workspaces/{workspace_id}/custom-fields', query: { limit: CATALOG_PAGE_LIMIT, page }, strategy: 'bearer' };
}

/** Persons holding a phone, from the indexed v2 search (workspace). */
export function findPersonsByPhone(phone: string): HttpCall {
    return { method: 'GET', rawPath: PERSONS_V2, query: { phone, limit: PERSON_LOOKUP_LIMIT }, strategy: 'workspace' };
}

/** Persons holding a phone, from the v1 listing, which sees a fresh create (workspace). */
export function findPersonsByPhoneFresh(phone: string): HttpCall {
    return { method: 'GET', rawPath: PERSONS_V1, query: { phone, limit: PERSON_LOOKUP_LIMIT }, strategy: 'workspace' };
}

/** Open attendances of a stored phone on a connection; the service key is `<connectionId>_<phone>` (workspace). */
export function findOpenAttendances(connectionId: string, storedPhone: string): HttpCall {
    return {
        method: 'GET',
        rawPath: '/v2/workspaces/{workspace_id}/services',
        query: { key: `${connectionId}_${storedPhone}`, statuses: OPEN_ATTENDANCE_STATUSES.join(','), limit: ATTENDANCE_LOOKUP_LIMIT },
        strategy: 'workspace',
    };
}

/** Creates a person (workspace). */
export function createPerson(body: PersonCreateBody): HttpCall {
    return { method: 'POST', rawPath: PERSONS_V1, body, strategy: 'workspace' };
}

/** Updates a person; custom fields merge by id (workspace). */
export function updatePerson(personId: string, body: PersonUpdateBody): HttpCall {
    return { method: 'PUT', rawPath: PERSON_V1, pathParams: { person_id: personId }, body, strategy: 'workspace' };
}

/** Removes followers from a person (workspace). */
export function removePersonFollowers(personId: string, followerIds: readonly string[]): HttpCall {
    return { method: 'PUT', rawPath: `${PERSON_V1}/remove-followers`, pathParams: { person_id: personId }, body: { followers: followerIds }, strategy: 'workspace' };
}

/** Adds owners to a person, keeping the current ones (workspace). */
export function addPersonOwners(personId: string, userIds: readonly string[]): HttpCall {
    return { method: 'PUT', rawPath: `${PERSON_V1}/add-users`, pathParams: { person_id: personId }, body: { users: userIds }, strategy: 'workspace' };
}

/** Removes owners from a person (workspace). */
export function removePersonOwners(personId: string, userIds: readonly string[]): HttpCall {
    return { method: 'PUT', rawPath: `${PERSON_V1}/remove-users`, pathParams: { person_id: personId }, body: { users: userIds }, strategy: 'workspace' };
}

/** Creates a fixed segmentation (Bearer only). */
export function createSegmentation(body: SegmentationCreateBody): HttpCall {
    return { method: 'POST', rawPath: SEGMENTATIONS, body, strategy: 'bearer' };
}

/** Adds one person to a segmentation; the route refuses batches (workspace). */
export function addSegmentationItem(segmentationId: string, personId: string): HttpCall {
    return { method: 'POST', rawPath: SEGMENTATION_ITEMS, pathParams: { segmentation_id: segmentationId }, body: { person: personId }, strategy: 'workspace' };
}

/** Segmentation items of one person; only the flat `person` query filters (workspace). */
export function findSegmentationItemsOfPerson(segmentationId: string, personId: string): HttpCall {
    return {
        method: 'GET',
        rawPath: SEGMENTATION_ITEMS,
        pathParams: { segmentation_id: segmentationId },
        query: { person: personId, limit: SEGMENTATION_ITEM_LOOKUP_LIMIT },
        strategy: 'workspace',
    };
}

/** Counts the persons matching report filters, the same resolution a campaign uses (Bearer only). */
export function countAudience(filters: readonly SegmentationFilter[]): HttpCall {
    return { method: 'POST', rawPath: '/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/count', body: { filters }, strategy: 'bearer' };
}

/** Creates a v2 campaign, which fans the template out server side (Bearer only). */
export function createCampaign(body: CampaignCreateBody): HttpCall {
    return { method: 'POST', rawPath: '/v2/workspaces/{workspace_id}/campaigns', body, strategy: 'bearer' };
}

/** Campaigns with an exact name; only the flat `name` query filters (Bearer only). */
export function findCampaignsByName(name: string): HttpCall {
    return { method: 'GET', rawPath: '/v1/workspaces/{workspace_id}/campaigns', query: { name, limit: CAMPAIGN_RECONCILE_PAGE_LIMIT }, strategy: 'bearer' };
}
