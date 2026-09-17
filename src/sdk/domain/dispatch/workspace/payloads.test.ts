import { describe, it, expect } from 'vitest';
import {
    toAttendanceStatus,
    toCampaignSummary,
    toCreatedId,
    toCustomFieldDefinition,
    toPayloadPage,
    toPersonIdentity,
    toPersonSnapshot,
    toRosterUser,
    toSegmentationItem,
} from './payloads';
import { UnexpectedPayloadError } from './errors';
import personsV2 from './__fixtures__/persons-v2-by-phone.json';
import personsV1 from './__fixtures__/persons-v1-by-phone.json';
import services from './__fixtures__/services-by-key.json';
import users from './__fixtures__/users-page.json';
import customFields from './__fixtures__/custom-fields-page.json';
import segmentationItems from './__fixtures__/segmentation-items-by-person.json';
import campaignsByName from './__fixtures__/campaigns-by-name.json';
import campaignCreated from './__fixtures__/campaign-created.json';

/** A copy of a fixture item without one field. */
function without(item: object, field: string): Record<string, unknown> {
    const copy: Record<string, unknown> = { ...item };
    delete copy[field];
    return copy;
}

describe('toPayloadPage', () => {
    it('reads results and totalPages of a captured page', () => {
        expect(toPayloadPage(users, 'users')).toEqual({ results: users.results, totalPages: 2 });
    });

    it('throws when results is missing', () => {
        expect(() => toPayloadPage({ totalPages: 1 }, 'users')).toThrow(UnexpectedPayloadError);
    });
});

describe('toCreatedId', () => {
    it('reads the id of a created resource', () => {
        expect(toCreatedId(campaignCreated, 'campaign')).toBe('6aab0ad2c6653859e764285b');
    });

    it('throws when the id is missing', () => {
        expect(() => toCreatedId({}, 'campaign')).toThrow(/campaign/);
    });
});

describe('toPersonSnapshot (v2 search)', () => {
    it('reads the captured person', () => {
        expect(toPersonSnapshot(personsV2.results[0])).toEqual({
            id: '6a207e428e3c5e6651860144',
            isBlocked: false,
            ownerIds: ['69cc0e5cf6aaa7942e1fd8fe', '6a1cfbb1b0975d16c88fac56', '6a4bb5ded86135c308cfc876'],
            followerIds: ['6a1cfbbe18795d48f05c07d0'],
            phones: ['5551999990001'],
        });
    });

    it.each(['is_blocked', 'users', 'followers', 'phones'])('throws naming the person when %s is missing', (field) => {
        expect(() => toPersonSnapshot(without(personsV2.results[0]!, field))).toThrow(/6a207e428e3c5e6651860144/);
    });
});

describe('toPersonIdentity (v1 listing)', () => {
    it('reads id and phones without is_blocked', () => {
        expect(toPersonIdentity(personsV1.results[0])).toEqual({ id: '6a207e428e3c5e6651860144', phones: ['5551999990001'] });
    });

    it('throws when the id is missing', () => {
        expect(() => toPersonIdentity(without(personsV1.results[0]!, 'id'))).toThrow(UnexpectedPayloadError);
    });
});

describe('toAttendanceStatus', () => {
    it('reads id and status of a captured service', () => {
        expect(toAttendanceStatus(services.results[0])).toEqual({ id: '6a35d214f8ae52b515232c53', status: 'finished' });
    });

    it('throws naming the service when status is missing', () => {
        expect(() => toAttendanceStatus(without(services.results[0]!, 'status'))).toThrow(/6a35d214f8ae52b515232c53/);
    });
});

describe('toRosterUser', () => {
    it('reads the nested user id, not the membership id', () => {
        expect(toRosterUser(users.results[0])).toEqual({ id: '6a60b5d774a44ae7725e16d2', email: 'bruna.lima@example.com', name: 'Bruna Lima' });
    });

    it('throws naming the user when the email is missing', () => {
        const entry = { ...users.results[0]!, user: without(users.results[0]!.user, 'email') };

        expect(() => toRosterUser(entry)).toThrow(/6a60b5d774a44ae7725e16d2/);
    });
});

describe('toCustomFieldDefinition', () => {
    it('reads id, target and type', () => {
        const firstName = customFields.results.find((field) => field.name === 'Primeiro Nome');

        expect(toCustomFieldDefinition(firstName)).toEqual({ id: '6a58642a4d7c0aa11db4d93e', target: 'person', type: 'string' });
    });

    it('throws naming the field when the target is missing', () => {
        expect(() => toCustomFieldDefinition(without(customFields.results[0]!, 'target'))).toThrow(/6a0c721a0c96ad8935ad4086/);
    });
});

describe('toSegmentationItem', () => {
    it('reads id and person', () => {
        expect(toSegmentationItem(segmentationItems.results[0])).toEqual({ id: '6a589ac20234f4130114d6ef', person: '6a207e428e3c5e6651860144' });
    });

    it('throws naming the item when the person is missing', () => {
        expect(() => toSegmentationItem(without(segmentationItems.results[0]!, 'person'))).toThrow(/6a589ac20234f4130114d6ef/);
    });
});

describe('toCampaignSummary', () => {
    it('reads id, name and quantity', () => {
        expect(toCampaignSummary(campaignsByName.results[0])).toEqual({ id: '6aab0ad2c6653859e764285b', name: 'probe-04-1789594291519', quantity: 1 });
    });

    it('throws naming the campaign when quantity is missing', () => {
        expect(() => toCampaignSummary(without(campaignsByName.results[0]!, 'quantity'))).toThrow(/6aab0ad2c6653859e764285b/);
    });
});
