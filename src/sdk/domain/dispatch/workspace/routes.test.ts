import { describe, it, expect } from 'vitest';
import * as routes from './routes';

const PERSON = '6a207e428e3c5e6651860144';
const SEGMENTATION = '6a589ac29c70672890006862';

describe('routes', () => {
    it.each([
        ['listUsersPage', routes.listUsersPage(2, 50), 'GET', '/v1/workspaces/{workspace_id}/users', 'workspace'],
        ['listCustomFieldsPage', routes.listCustomFieldsPage(1, 50), 'GET', '/v1/workspaces/{workspace_id}/custom-fields', 'bearer'],
        ['findPersonsByPhone', routes.findPersonsByPhone('5551999000001', 50), 'GET', '/v2/workspaces/{workspace_id}/persons', 'workspace'],
        ['findPersonsByPhoneFresh', routes.findPersonsByPhoneFresh('5551999000001', 50), 'GET', '/v1/workspaces/{workspace_id}/persons', 'workspace'],
        ['findOpenAttendances', routes.findOpenAttendances('conn', '5551999000001', 50), 'GET', '/v2/workspaces/{workspace_id}/services', 'workspace'],
        ['createPerson', routes.createPerson({}), 'POST', '/v1/workspaces/{workspace_id}/persons', 'workspace'],
        ['updatePerson', routes.updatePerson(PERSON, {}), 'PUT', '/v1/workspaces/{workspace_id}/persons/{person_id}', 'workspace'],
        ['removePersonFollowers', routes.removePersonFollowers(PERSON, ['u']), 'PUT', '/v1/workspaces/{workspace_id}/persons/{person_id}/remove-followers', 'workspace'],
        ['addPersonOwners', routes.addPersonOwners(PERSON, ['u']), 'PUT', '/v1/workspaces/{workspace_id}/persons/{person_id}/add-users', 'workspace'],
        ['removePersonOwners', routes.removePersonOwners(PERSON, ['u']), 'PUT', '/v1/workspaces/{workspace_id}/persons/{person_id}/remove-users', 'workspace'],
        ['createSegmentation', routes.createSegmentation({ name: 'n', description: 'n', type: 'person', result_type: 'fixed' }), 'POST', '/v1/workspaces/{workspace_id}/segmentations', 'bearer'],
        ['addSegmentationItem', routes.addSegmentationItem(SEGMENTATION, PERSON), 'POST', '/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items', 'workspace'],
        ['findSegmentationItemsOfPerson', routes.findSegmentationItemsOfPerson(SEGMENTATION, PERSON, 50), 'GET', '/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items', 'workspace'],
        ['countAudience', routes.countAudience([]), 'POST', '/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/count', 'bearer'],
        ['listFilteredPersonsPage', routes.listFilteredPersonsPage([], 1, 1000), 'POST', '/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/message-stats/list', 'bearer'],
        ['findCampaignsByName', routes.findCampaignsByName('label [job]', 50), 'GET', '/v1/workspaces/{workspace_id}/campaigns', 'bearer'],
    ])('%s pins method, path and strategy', (_name, call, method, rawPath, strategy) => {
        expect(call).toMatchObject({ method, rawPath, strategy });
    });

    it('createCampaign is a Bearer POST to the v2 campaigns', () => {
        const call = routes.createCampaign({} as Parameters<typeof routes.createCampaign>[0]);

        expect(call).toMatchObject({ method: 'POST', rawPath: '/v2/workspaces/{workspace_id}/campaigns', strategy: 'bearer' });
    });

    it('builds the attendance key from the connection and the stored phone', () => {
        expect(routes.findOpenAttendances('conn-1', '5551999000001', 50).query).toEqual({
            key: 'conn-1_5551999000001',
            statuses: 'pending,in_queue,in_attendance,in_bot',
            limit: 50,
        });
    });

    it('filters segmentation items and campaigns with the flat query the API honors', () => {
        expect(routes.findSegmentationItemsOfPerson(SEGMENTATION, PERSON, 50)).toMatchObject({ pathParams: { segmentation_id: SEGMENTATION }, query: { person: PERSON } });
        expect(routes.findCampaignsByName('label [job]', 50).query).toMatchObject({ name: 'label [job]' });
    });

    it('pages the filtered persons at the limit it is given, with the filters in the body', () => {
        const filters = [{ type: 'in_segmentation', segmentation: SEGMENTATION }];

        expect(routes.listFilteredPersonsPage(filters, 3, 1000)).toMatchObject({ query: { limit: 1000, page: 3 }, body: { filters } });
    });

    it('takes every page size from the caller', () => {
        expect(routes.listUsersPage(4, 7).query).toEqual({ limit: 7, page: 4 });
        expect(routes.listCustomFieldsPage(1, 9).query).toEqual({ limit: 9, page: 1 });
        expect(routes.findPersonsByPhone('5551999000001', 12).query).toMatchObject({ limit: 12 });
        expect(routes.findPersonsByPhoneFresh('5551999000001', 13).query).toMatchObject({ limit: 13 });
        expect(routes.findSegmentationItemsOfPerson(SEGMENTATION, PERSON, 14).query).toMatchObject({ limit: 14 });
        expect(routes.findCampaignsByName('label [job]', 15).query).toMatchObject({ limit: 15 });
    });

    it('sends owner and follower changes as id lists', () => {
        expect(routes.addPersonOwners(PERSON, ['u1']).body).toEqual({ users: ['u1'] });
        expect(routes.removePersonOwners(PERSON, ['u1', 'u2']).body).toEqual({ users: ['u1', 'u2'] });
        expect(routes.removePersonFollowers(PERSON, ['u1']).body).toEqual({ followers: ['u1'] });
        expect(routes.addSegmentationItem(SEGMENTATION, PERSON).body).toEqual({ person: PERSON });
    });
});
