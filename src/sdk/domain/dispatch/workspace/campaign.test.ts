import { describe, it, expect } from 'vitest';
import {
    AUDIENCE_NOT_PROPAGATED_MESSAGE,
    buildAudienceQuery,
    buildCampaignBody,
    buildSegmentationBody,
    dispatchName,
    findCampaignByName,
    isAudienceNotPropagated,
    readAudienceCount,
    toDispatchConfig,
} from './campaign';
import { UnexpectedPayloadError } from './errors';
import { CONNECTION_ID, FIRST_NAME_FIELD_ID, TEMPLATE_ID, aRequest, completed, settingsOf } from './__fixtures__/builders';
import campaignsByName from './__fixtures__/campaigns-by-name.json';
import errorTooManyRequests from './__fixtures__/error-too-many-requests.json';
import type { DispatchJob } from './types';

const SEGMENTATION_ID = '6aab0ab20097a8ec50b5069e';
const JOB = {
    id: '0123456789abcdef-3-mfabc',
    settings: settingsOf(aRequest({ label: 'Campanha setembro' })),
    segmentationId: SEGMENTATION_ID,
    dispatchConfig: { batch_size: 5, batch_interval: 10 / 60 },
} as DispatchJob;

describe('toDispatchConfig', () => {
    it('converts the interval from seconds to minutes', () => {
        expect(toDispatchConfig({ batchSize: 5, intervalSeconds: 10 })).toEqual({ batch_size: 5, batch_interval: 0.16666666666666666 });
    });
});

describe('names', () => {
    it('names the segmentation and the campaign with the label and the job id', () => {
        expect(dispatchName(JOB)).toBe('Campanha setembro [0123456789abcdef-3-mfabc]');
        expect(buildSegmentationBody(JOB)).toEqual({ name: dispatchName(JOB), description: dispatchName(JOB), type: 'person', result_type: 'fixed' });
    });
});

describe('buildAudienceQuery and buildCampaignBody', () => {
    it('shares the very filter arrays between the count query and the campaign', () => {
        const audience = buildAudienceQuery(JOB);
        const body = buildCampaignBody(JOB);

        expect(audience.query).toEqual([{ type: 'in_segmentation', segmentation: SEGMENTATION_ID }, { type: 'whatsapp' }]);
        expect(body.arrayFilter).toEqual(audience.membership);
        expect(body.query).toEqual(audience.query);
    });

    it('matches the probe-04 recipe', () => {
        expect(buildCampaignBody(JOB)).toEqual({
            send_type: 'immediate',
            send_mode: 'fractional',
            type: 'whatsapp',
            name: 'Campanha setembro [0123456789abcdef-3-mfabc]',
            dispatch_config: { batch_size: 5, batch_interval: 10 / 60 },
            types: ['whatsapp', 'gupshup'],
            connection: CONNECTION_ID,
            template: TEMPLATE_ID,
            arrayFilter: [{ type: 'in_segmentation', segmentation: SEGMENTATION_ID }],
            query: [{ type: 'in_segmentation', segmentation: SEGMENTATION_ID }, { type: 'whatsapp' }],
            query_type: 'person',
            variables: { body: [`{{person.custom_fields.${FIRST_NAME_FIELD_ID}}}`] },
            properties: { variables: { whatsapp: { components: { examples: { body: { '0_is_expression': false } } } } } },
        });
    });
});

describe('readAudienceCount', () => {
    it('reads the count of a 2xx', () => {
        expect(readAudienceCount(completed(200, { count: 3, not_found: 0 }))).toBe(3);
    });

    it('throws without a numeric count or on another status', () => {
        expect(() => readAudienceCount(completed(200, {}))).toThrow(UnexpectedPayloadError);
        expect(() => readAudienceCount(completed(400, { count: 3 }))).toThrow(UnexpectedPayloadError);
    });
});

describe('isAudienceNotPropagated', () => {
    it('is true only for a 500 carrying the known message', () => {
        expect(isAudienceNotPropagated(completed(500, { message: AUDIENCE_NOT_PROPAGATED_MESSAGE }))).toBe(true);
        expect(isAudienceNotPropagated(completed(500, { message: 'Internal error' }))).toBe(false);
        expect(isAudienceNotPropagated(completed(429, errorTooManyRequests))).toBe(false);
        expect(isAudienceNotPropagated({ kind: 'transportFailed', message: AUDIENCE_NOT_PROPAGATED_MESSAGE })).toBe(false);
    });
});

describe('findCampaignByName', () => {
    it('finds the campaign by its exact name', () => {
        expect(findCampaignByName(completed(200, campaignsByName), 'probe-04-1789594291519')).toEqual({ id: '6aab0ad2c6653859e764285b', quantity: 1 });
    });

    it('ignores a partial name', () => {
        expect(findCampaignByName(completed(200, campaignsByName), 'probe-04')).toBeUndefined();
    });

    it('throws on a non-2xx listing', () => {
        expect(() => findCampaignByName(completed(500), 'x')).toThrow(UnexpectedPayloadError);
    });
});
