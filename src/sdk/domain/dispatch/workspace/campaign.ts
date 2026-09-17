/**
 * The campaign side of a dispatch: pacing conversion, names, the single audience filter
 * shared by the count and the campaign, the creation bodies and the readers of the
 * count and campaign responses.
 */

import type { CallResult } from '../../../core/call-executor';
import type { CampaignCreateBody, DispatchJob, DispatchPacing, HabllaDispatchConfig, SegmentationCreateBody, SegmentationFilter } from './types';
import { isSuccess } from './call-failures';
import { requireSegmentationId } from './contact-writes';
import { UnexpectedPayloadError } from './errors';
import { toCampaignSummary, toPayloadPage } from './payloads';

/** Hablla's campaign pacing is in minutes; the operator's is in seconds. */
export const SECONDS_PER_MINUTE = 60;

/** Status of the count while the new segmentation has not propagated to the report engine. */
const AUDIENCE_NOT_PROPAGATED_STATUS = 500;

/** Message of the count while the new segmentation has not propagated to the report engine. */
export const AUDIENCE_NOT_PROPAGATED_MESSAGE = 'Erro ao resolver segmentações';

/** The only seconds-to-minutes conversion of the dispatch pacing. */
export function toDispatchConfig(pacing: DispatchPacing): HabllaDispatchConfig {
    return { batch_size: pacing.batchSize, batch_interval: pacing.intervalSeconds / SECONDS_PER_MINUTE };
}

/**
 * Name of the job's segmentation and campaign. It carries the job id, not only the
 * fingerprint, because a confirmed repeat shares the fingerprint and the campaign
 * reconciliation must tell the two apart.
 */
export function dispatchName(job: DispatchJob): string {
    return `${job.settings.label} [${job.id}]`;
}

/**
 * The single source of the audience filter: membership in the job's segmentation, and the
 * query that also requires WhatsApp. The count uses `query`; the campaign sends
 * `membership` as `arrayFilter` and `query` as `query` (probe 04).
 */
export function buildAudienceQuery(job: DispatchJob): { membership: readonly SegmentationFilter[]; query: readonly SegmentationFilter[] } {
    const membership: readonly SegmentationFilter[] = [{ type: 'in_segmentation', segmentation: requireSegmentationId(job) }];

    return { membership, query: [...membership, { type: 'whatsapp' }] };
}

/** Body of the job's fixed person segmentation; its name comes from the job alone, so it is known before `start` sets the id. */
export function buildSegmentationBody(job: DispatchJob): SegmentationCreateBody {
    const name = dispatchName(job);

    return { name, description: name, type: 'person', result_type: 'fixed' };
}

/**
 * Body of the job's campaign: the probe-04 recipe, with the first-name custom field as
 * the single body variable, resolved per person (`0_is_expression: false`).
 *
 * @throws Error when the job has no pacing yet (a planning bug).
 */
export function buildCampaignBody(job: DispatchJob): CampaignCreateBody {
    const audience = buildAudienceQuery(job);

    if (!job.dispatchConfig) {
        throw new Error(`Dispatch job ${job.id} has no dispatch config`);
    }

    return {
        send_type: 'immediate',
        send_mode: 'fractional',
        type: 'whatsapp',
        name: dispatchName(job),
        dispatch_config: job.dispatchConfig,
        types: ['whatsapp', 'gupshup'],
        connection: job.settings.connectionId,
        template: job.settings.templateId,
        arrayFilter: audience.membership,
        query: audience.query,
        query_type: 'person',
        variables: { body: [`{{person.custom_fields.${job.settings.firstNameFieldId}}}`] },
        properties: { variables: { whatsapp: { components: { examples: { body: { '0_is_expression': false } } } } } },
    };
}

/**
 * The audience count of a successful count response.
 *
 * @throws UnexpectedPayloadError for any other result or a count that is not a number.
 */
export function readAudienceCount(result: CallResult): number {
    const data = isSuccess(result) ? result.data as { count?: unknown } | null : undefined;
    const count = data?.count;

    if (typeof count !== 'number' || !Number.isFinite(count)) {
        throw new UnexpectedPayloadError('audience count', `expected a 2xx with a numeric count, got ${JSON.stringify(result)}`);
    }

    return count;
}

/** True for the transient 500 the count answers while the segmentation has not propagated. */
export function isAudienceNotPropagated(result: CallResult): boolean {
    if (result.kind !== 'completed' || result.status !== AUDIENCE_NOT_PROPAGATED_STATUS) {
        return false;
    }

    const data = result.data as { message?: unknown } | null;

    return data?.message === AUDIENCE_NOT_PROPAGATED_MESSAGE;
}

/**
 * The campaign with exactly this name in a successful listing.
 *
 * @throws UnexpectedPayloadError when the result is not a 2xx listing.
 */
export function findCampaignByName(result: CallResult, name: string): { id: string; quantity: number } | undefined {
    if (!isSuccess(result)) {
        throw new UnexpectedPayloadError('campaign listing', `expected a 2xx, got ${JSON.stringify(result)}`);
    }

    const campaign = toPayloadPage(result.data, 'campaign listing').results.map(toCampaignSummary).find((candidate) => candidate.name === name);

    return campaign ? { id: campaign.id, quantity: campaign.quantity } : undefined;
}
