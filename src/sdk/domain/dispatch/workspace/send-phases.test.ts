import { describe, it, expect } from 'vitest';
import { isCampaignReconcileDue, resolveAudienceCount, resolveCampaignCreation, resolveCampaignReconciliation, withCampaignInFlight } from './send-phases';
import { AUDIENCE_NOT_PROPAGATED_MESSAGE } from './campaign';
import { CALL_RETRY_DELAY_MS, RECONCILIATION_DELAY_MS } from './constants';
import { UnexpectedPayloadError } from './errors';
import { aRequest, completed, page, settingsOf } from './__fixtures__/builders';
import campaignCreated from './__fixtures__/campaign-created.json';
import type { DispatchJob } from './types';

const NOW = 1_800_000_000_000;
const BASE = {
    id: '0123456789abcdef-2-mfabc',
    revision: 3,
    settings: settingsOf(aRequest({ label: 'Campanha' })),
    segmentationId: 'seg-1',
    dispatchConfig: { batch_size: 5, batch_interval: 1 },
    warnings: [],
} as unknown as DispatchJob;
const AWAITING: DispatchJob = { ...BASE, phase: 'awaitingAudience', audienceSize: 2, audienceDeadlineAt: NOW + 1000 };
const SENDING: DispatchJob = withCampaignInFlight({ ...BASE, phase: 'sending', audienceSize: 1 }, NOW);

describe('resolveAudienceCount', () => {
    it('moves to sending when the count matches', () => {
        expect(resolveAudienceCount(AWAITING, completed(200, { count: 2 }), NOW)).toMatchObject({ kind: 'advanced', job: { phase: 'sending', lastAudienceCount: 2 } });
    });

    it('waits on the not-propagated 500 and on a smaller count', () => {
        expect(resolveAudienceCount(AWAITING, completed(500, { message: AUDIENCE_NOT_PROPAGATED_MESSAGE }), NOW)).toMatchObject({ kind: 'wait', job: { phase: 'awaitingAudience' } });
        expect(resolveAudienceCount(AWAITING, completed(200, { count: 1 }), NOW)).toMatchObject({ kind: 'wait', job: { lastAudienceCount: 1 } });
    });

    it('fails with audience_timeout at the deadline, reporting the last count', () => {
        const resolution = resolveAudienceCount({ ...AWAITING, lastAudienceCount: 1 }, completed(500, { message: AUDIENCE_NOT_PROPAGATED_MESSAGE }), NOW + 1000);

        expect(resolution).toMatchObject({
            kind: 'advanced',
            job: { phase: 'failed', failure: { reason: 'audience_timeout', detail: 'audience not ready: last count 1, expected 2', resumePhase: 'awaitingAudience' } },
        });
    });

    it('fails with audience_mismatch on a larger count', () => {
        expect(resolveAudienceCount(AWAITING, completed(200, { count: 3 }), NOW)).toMatchObject({ kind: 'advanced', job: { phase: 'failed', failure: { reason: 'audience_mismatch' } } });
    });

    it('fails with bearer_token_rejected on a 401', () => {
        expect(resolveAudienceCount(AWAITING, completed(401), NOW)).toMatchObject({ kind: 'advanced', job: { failure: { reason: 'bearer_token_rejected', resumePhase: 'awaitingAudience' } } });
    });

    it('stops on a throttle or a network failure', () => {
        expect(resolveAudienceCount(AWAITING, { kind: 'throttled' }, NOW)).toEqual({ kind: 'stop', cause: 'throttled', job: AWAITING });
        expect(resolveAudienceCount(AWAITING, { kind: 'transportFailed', message: 'reset' }, NOW)).toEqual({ kind: 'stop', cause: 'interrupted', job: AWAITING });
    });

    it('throws on any other status', () => {
        expect(() => resolveAudienceCount(AWAITING, completed(500, { message: 'other' }), NOW)).toThrow(UnexpectedPayloadError);
        expect(() => resolveAudienceCount(AWAITING, completed(400), NOW)).toThrow(UnexpectedPayloadError);
    });
});

describe('resolveCampaignCreation', () => {
    it('completes with the created campaign', () => {
        expect(resolveCampaignCreation(SENDING, completed(201, campaignCreated), NOW)).toMatchObject({
            kind: 'advanced',
            job: { phase: 'completed', campaignId: '6aab0ad2c6653859e764285b', campaignQuantity: 1, campaignSendState: undefined, warnings: [] },
        });
    });

    it('clears the marker and cools down on a throttle', () => {
        expect(resolveCampaignCreation(SENDING, { kind: 'throttled' }, NOW)).toMatchObject({ kind: 'stop', cause: 'throttled', job: { phase: 'sending', campaignSendState: undefined } });
    });

    it('keeps the marker and schedules a reconciliation on an unknown outcome', () => {
        expect(resolveCampaignCreation(SENDING, completed(502), NOW)).toMatchObject({ kind: 'wait', job: { campaignSendState: 'inFlight', campaignReconcileNotBefore: NOW + RECONCILIATION_DELAY_MS } });
        expect(resolveCampaignCreation(SENDING, { kind: 'interrupted', message: 'down' }, NOW)).toMatchObject({ kind: 'stop', cause: 'interrupted', job: { campaignSendState: 'inFlight' } });
    });

    it('clears the marker and fails on a refusal or a refused token', () => {
        expect(resolveCampaignCreation(SENDING, completed(400, { message: 'bad template' }), NOW)).toMatchObject({
            kind: 'advanced',
            job: { phase: 'failed', campaignSendState: undefined, failure: { reason: 'campaign_rejected', resumePhase: 'sending' } },
        });
        expect(resolveCampaignCreation(SENDING, completed(403), NOW)).toMatchObject({ kind: 'advanced', job: { campaignSendState: undefined, failure: { reason: 'bearer_token_rejected' } } });
    });
});

describe('resolveCampaignReconciliation', () => {
    const named = { id: 'c9', name: 'Campanha [0123456789abcdef-2-mfabc]', quantity: 1 };

    it('completes when the campaign exists', () => {
        expect(resolveCampaignReconciliation(SENDING, completed(200, page([named])), NOW)).toMatchObject({ kind: 'advanced', job: { phase: 'completed', campaignId: 'c9' } });
    });

    it('clears the marker and fails as not created when it does not exist', () => {
        expect(resolveCampaignReconciliation(SENDING, completed(200, page([])), NOW)).toMatchObject({
            kind: 'advanced',
            job: { phase: 'failed', campaignSendState: undefined, failure: { reason: 'campaign_rejected', detail: 'not created' } },
        });
    });

    it('retries later and finally fails as unknown, keeping the marker', () => {
        const first = resolveCampaignReconciliation(SENDING, completed(500), NOW);

        expect(first).toMatchObject({ kind: 'wait', job: { campaignReconcileAttempts: 1, campaignReconcileNotBefore: NOW + CALL_RETRY_DELAY_MS } });

        const last = resolveCampaignReconciliation({ ...SENDING, campaignReconcileAttempts: 2 }, completed(500), NOW);

        expect(last).toMatchObject({ kind: 'advanced', job: { phase: 'failed', campaignSendState: 'inFlight', failure: { reason: 'campaign_outcome_unknown', resumePhase: 'sending' } } });
    });
});

describe('isCampaignReconcileDue', () => {
    it('is due once the reconciliation delay has passed', () => {
        expect(isCampaignReconcileDue({ ...SENDING, campaignReconcileNotBefore: NOW + 1 }, NOW)).toBe(false);
        expect(isCampaignReconcileDue({ ...SENDING, campaignReconcileNotBefore: NOW }, NOW)).toBe(true);
    });
});
