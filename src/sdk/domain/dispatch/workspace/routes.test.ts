import { describe, it, expect } from 'vitest';
import * as routes from './routes';
import { EXCLUSION_PAGE_LIMIT } from './constants';

const PERSON = '6a207e428e3c5e6651860144';
const SEGMENTATION = '6a589ac29c70672890006862';

describe('routes', () => {
    it.each([
        ['listUsersPage', routes.listUsersPage(2), 'GET', '/v1/workspaces/{workspace_id}/users', 'workspace'],
        ['listCustomFieldsPage', routes.listCustomFieldsPage(1), 'GET', '/v1/workspaces/{workspace_id}/custom-fields', 'bearer'],
        ['findPersonsByPhone', routes.findPersonsByPhone('5551999000001'), 'GET', '/v2/workspaces/{workspace_id}/persons', 'workspace'],
        ['findPersonsByPhoneFresh', routes.findPersonsByPhoneFresh('5551999000001'), 'GET', '/v1/workspaces/{workspace_id}/persons', 'workspace'],
        ['findOpenAttendances', routes.findOpenAttendances('conn', '5551999000001'), 'GET', '/v2/workspaces/{workspace_id}/services', 'workspace'],
        ['createPerson', routes.createPerson({}), 'POST', '/v1/workspaces/{workspace_id}/persons', 'workspace'],
        ['updatePerson', routes.updatePerson(PERSON, {}), 'PUT', '/v1/workspaces/{workspace_id}/persons/{person_id}', 'workspace'],
        ['removePersonFollowers', routes.removePersonFollowers(PERSON, ['u']), 'PUT', '/v1/workspaces/{workspace_id}/persons/{person_id}/remove-followers', 'workspace'],
        ['addPersonOwners', routes.addPersonOwners(PERSON, ['u']), 'PUT', '/v1/workspaces/{workspace_id}/persons/{person_id}/add-users', 'workspace'],
        ['removePersonOwners', routes.removePersonOwners(PERSON, ['u']), 'PUT', '/v1/workspaces/{workspace_id}/persons/{person_id}/remove-users', 'workspace'],
        ['createSegmentation', routes.createSegmentation({ name: 'n', description: 'n', type: 'person', result_type: 'fixed' }), 'POST', '/v1/workspaces/{workspace_id}/segmentations', 'bearer'],
        ['addSegmentationItem', routes.addSegmentationItem(SEGMENTATION, PERSON), 'POST', '/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items', 'workspace'],
        ['findSegmentationItemsOfPerson', routes.findSegmentationItemsOfPerson(SEGMENTATION, PERSON), 'GET', '/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items', 'workspace'],
        ['countAudience', routes.countAudience([]), 'POST', '/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/count', 'bearer'],
        ['listFilteredPersonsPage', routes.listFilteredPersonsPage([], 1), 'POST', '/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/message-stats/list', 'bearer'],
        ['findCampaignsByName', routes.findCampaignsByName('label [job]'), 'GET', '/v1/workspaces/{workspace_id}/campaigns', 'bearer'],
    ])('%s pins method, path and strategy', (_name, call, method, rawPath, strategy) => {
        expect(call).toMatchObject({ method, rawPath, strategy });
    });

    it('createCampaign is a Bearer POST to the v2 campaigns', () => {
        const call = routes.createCampaign({} as Parameters<typeof routes.createCampaign>[0]);

        expect(call).toMatchObject({ method: 'POST', rawPath: '/v2/workspaces/{workspace_id}/campaigns', strategy: 'bearer' });
    });

    it('builds the attendance key from the connection and the stored phone', () => {
        expect(routes.findOpenAttendances('conn-1', '5551999000001').query).toEqual({
            key: 'conn-1_5551999000001',
            statuses: 'pending,in_queue,in_attendance,in_bot',
            limit: 50,
        });
    });

    it('filters segmentation items and campaigns with the flat query the API honors', () => {
        expect(routes.findSegmentationItemsOfPerson(SEGMENTATION, PERSON)).toMatchObject({ pathParams: { segmentation_id: SEGMENTATION }, query: { person: PERSON } });
        expect(routes.findCampaignsByName('label [job]').query).toMatchObject({ name: 'label [job]' });
    });

    it('pages the filtered persons at the largest limit the report route accepts, with the filters in the body', () => {
        const filters = [{ type: 'in_segmentation', segmentation: SEGMENTATION }];

        expect(routes.listFilteredPersonsPage(filters, 3)).toMatchObject({ query: { limit: EXCLUSION_PAGE_LIMIT, page: 3 }, body: { filters } });
    });

    it('sends owner and follower changes as id lists', () => {
        expect(routes.addPersonOwners(PERSON, ['u1']).body).toEqual({ users: ['u1'] });
        expect(routes.removePersonOwners(PERSON, ['u1', 'u2']).body).toEqual({ users: ['u1', 'u2'] });
        expect(routes.removePersonFollowers(PERSON, ['u1']).body).toEqual({ followers: ['u1'] });
        expect(routes.addSegmentationItem(SEGMENTATION, PERSON).body).toEqual({ person: PERSON });
    });
});
