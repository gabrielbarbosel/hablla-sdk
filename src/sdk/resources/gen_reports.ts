import { Resource } from './base';

/** `reports` resource (generated from openapi.json). */
export class Reports extends Resource {
    /**
     * getCrmListMetrics.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/board/{board_id}/list
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCrmListMetrics(boardId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/board/{board_id}/list', { path: { board_id: boardId }, query: opts.query });
    }

    /**
     * getBoard.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/board/{board_id}
     * @remarks Documented query: filters (extra keys allowed).
     */
    getBoard(boardId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/board/{board_id}', { path: { board_id: boardId }, query: opts.query });
    }

    /**
     * getCard.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/card/{card_id}
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCard(cardId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/card/{card_id}', { path: { card_id: cardId }, query: opts.query });
    }

    /**
     * getChurn.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/cscx-metrics/churn
     * @remarks Documented query: filters (extra keys allowed).
     */
    getChurn(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/cscx-metrics/churn', { query: opts.query });
    }

    /**
     * getOrganizations.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/cscx-metrics/organizations
     * @remarks Documented query: filters (extra keys allowed).
     */
    getOrganizations(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/cscx-metrics/organizations', { query: opts.query });
    }

    /**
     * getUser.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/user/{user_id}
     * @remarks Documented query: filters (extra keys allowed).
     */
    getUser(userId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/user/{user_id}', { path: { user_id: userId }, query: opts.query });
    }

    /**
     * getCount.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/users/count
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCount(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/users/count', { query: opts.query });
    }

    /**
     * getCscxMetrics.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/cscx-metrics
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCscxMetrics(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/cscx-metrics', { query: opts.query });
    }

    /**
     * getUsers.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/users
     * @remarks Documented query: filters (extra keys allowed).
     */
    getUsers(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/metrics/users', { query: opts.query });
    }

    /**
     * getCounts.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/nps/{np_id}/counts
     * @remarks Any query params may be sent (none documented).
     */
    getCounts(npId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/nps/{np_id}/counts', { path: { np_id: npId }, query: opts.query });
    }

    /**
     * getNpsSummary.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/nps/{np_id}/summary
     * @remarks Any query params may be sent (none documented).
     */
    getNpsSummary(npId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/nps/{np_id}/summary', { path: { np_id: npId }, query: opts.query });
    }

    /**
     * getDacList.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/plans/dac/list
     * @remarks Documented query: filters (extra keys allowed).
     */
    getDacList(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/plans/dac/list', { query: opts.query });
    }

    /**
     * getCampaignEmailsStatsList.
     * @method POST /v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/email-stats/list
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCampaignEmailsStatsList(body: Record<string, unknown>, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/email-stats/list', { body, query: opts.query });
    }

    /**
     * getCampaignMessagesStatsList.
     * @method POST /v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/message-stats/list
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCampaignMessagesStatsList(body: Record<string, unknown>, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/message-stats/list', { body, query: opts.query });
    }

    /**
     * Get all desahboard users counters by me.
     * @method GET /v1/workspaces/{workspace_id}/reports/services/dashboard/users-counters/me
     * @remarks Documented query: page, limit, user, sector, connection, is_available, is_available_to_call (extra keys allowed).
     */
    ReportsController_getAllDashBoardUsersCountersMe_v1(opts: { query?: { page?: number; limit?: number; user?: string; sector?: string; connection?: string; is_available?: boolean; is_available_to_call?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/services/dashboard/users-counters/me', { query: opts.query });
    }

    /**
     * getMonthlySessionsStates.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/admin/monthly-sessions-states
     * @remarks Documented query: filters (extra keys allowed).
     */
    getMonthlySessionsStates(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/admin/monthly-sessions-states', { query: opts.query });
    }

    /**
     * getUsersUsingCrm.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/admin/users-using-crm
     * @remarks Documented query: filters (extra keys allowed).
     */
    getUsersUsingCrm(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/admin/users-using-crm', { query: opts.query });
    }

    /**
     * getUsersUsingServices.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/admin/users-using-services
     * @remarks Documented query: filters (extra keys allowed).
     */
    getUsersUsingServices(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/admin/users-using-services', { query: opts.query });
    }

    /**
     * getEmailsFunnel.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-funnel
     * @remarks Documented query: filters (extra keys allowed).
     */
    getEmailsFunnel(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-funnel', { query: opts.query });
    }

    /**
     * getEmailsHistograms.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-histograms
     * @remarks Documented query: filters (extra keys allowed).
     */
    getEmailsHistograms(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-histograms', { query: opts.query });
    }

    /**
     * getEmailsKpi.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-kpi
     * @remarks Documented query: filters (extra keys allowed).
     */
    getEmailsKpi(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-kpi', { query: opts.query });
    }

    /**
     * getEmailsList.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-list
     * @remarks Documented query: filters (extra keys allowed).
     */
    getEmailsList(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-list', { query: opts.query });
    }

    /**
     * getEmailsReadHeatmap.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-read-heatmap
     * @remarks Documented query: filters (extra keys allowed).
     */
    getEmailsReadHeatmap(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-read-heatmap', { query: opts.query });
    }

    /**
     * getEmailsTimeline.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-timeline
     * @remarks Documented query: filters (extra keys allowed).
     */
    getEmailsTimeline(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/emails-timeline', { query: opts.query });
    }

    /**
     * getMessagesFunnel.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-funnel
     * @remarks Documented query: filters (extra keys allowed).
     */
    getMessagesFunnel(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-funnel', { query: opts.query });
    }

    /**
     * getMessagesHistograms.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-histograms
     * @remarks Documented query: filters (extra keys allowed).
     */
    getMessagesHistograms(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-histograms', { query: opts.query });
    }

    /**
     * getMessagesKpi.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-kpi
     * @remarks Documented query: filters (extra keys allowed).
     */
    getMessagesKpi(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-kpi', { query: opts.query });
    }

    /**
     * getMessagesList.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-list
     * @remarks Documented query: filters (extra keys allowed).
     */
    getMessagesList(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-list', { query: opts.query });
    }

    /**
     * getMessagesReadHeatmap.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-read-heatmap
     * @remarks Documented query: filters (extra keys allowed).
     */
    getMessagesReadHeatmap(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-read-heatmap', { query: opts.query });
    }

    /**
     * getMessagesTimeline.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-timeline
     * @remarks Documented query: filters (extra keys allowed).
     */
    getMessagesTimeline(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/campaigns/messages-timeline', { query: opts.query });
    }

    /**
     * getCampaignCardsCount.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/campaign-cards-count
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCampaignCardsCount(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/campaign-cards-count', { query: opts.query });
    }

    /**
     * getCardsCount.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/cards-count
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCardsCount(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/cards-count', { query: opts.query });
    }

    /**
     * getCardsCountUsers.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/cards-count-users
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCardsCountUsers(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/cards-count-users', { query: opts.query });
    }

    /**
     * getCardsCountersByDay.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/cards-counters-by-day
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCardsCountersByDay(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/cards-counters-by-day', { query: opts.query });
    }

    /**
     * getCardsUserMetrics.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/cards-user-metrics
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCardsUserMetrics(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/cards-user-metrics', { query: opts.query });
    }

    /**
     * getFunnelCount.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/funnel-count
     * @remarks Documented query: filters (extra keys allowed).
     */
    getFunnelCount(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/funnel-count', { query: opts.query });
    }

    /**
     * getRepCardsMonthlyHistory.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/monthly-history
     * @remarks Documented query: filters (extra keys allowed).
     */
    getRepCardsMonthlyHistory(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/monthly-history', { query: opts.query });
    }

    /**
     * getRepCardsReasons.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/reasons
     * @remarks Documented query: filters (extra keys allowed).
     */
    getRepCardsReasons(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/reasons', { query: opts.query });
    }

    /**
     * getSourceCardsCount.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/source-cards-count
     * @remarks Documented query: filters (extra keys allowed).
     */
    getSourceCardsCount(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/source-cards-count', { query: opts.query });
    }

    /**
     * getTotalSalesBySectorUser.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/cards/total-sales-by-sector-user
     * @remarks Documented query: filters (extra keys allowed).
     */
    getTotalSalesBySectorUser(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/cards/total-sales-by-sector-user', { query: opts.query });
    }

    /**
     * getByModelToday.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/completions/by-model-today
     * @remarks Documented query: filters (extra keys allowed).
     */
    getByModelToday(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/completions/by-model-today', { query: opts.query });
    }

    /**
     * getRepFlowsExecutionsMonthlyHistory.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/flows-executions/monthly-history
     * @remarks Documented query: filters (extra keys allowed).
     */
    getRepFlowsExecutionsMonthlyHistory(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/flows-executions/monthly-history', { query: opts.query });
    }

    /**
     * getNodesCount.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/flows-executions/nodes-count
     * @remarks Documented query: filters (extra keys allowed).
     */
    getNodesCount(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/flows-executions/nodes-count', { query: opts.query });
    }

    /**
     * getRepFlowsExecutionsResume.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/flows-executions/resume
     * @remarks Documented query: filters (extra keys allowed).
     */
    getRepFlowsExecutionsResume(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/flows-executions/resume', { query: opts.query });
    }

    /**
     * getDomainRankOverview.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/marketing/domain-rank-overview
     * @remarks Any query params may be sent (none documented).
     */
    getDomainRankOverview(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/marketing/domain-rank-overview', { query: opts.query });
    }

    /**
     * getInstantPages.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/marketing/instant-pages
     * @remarks Any query params may be sent (none documented).
     */
    getInstantPages(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/marketing/instant-pages', { query: opts.query });
    }

    /**
     * getScreenshot.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/marketing/screenshot
     * @remarks Any query params may be sent (none documented).
     */
    getScreenshot(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/marketing/screenshot', { query: opts.query });
    }

    /**
     * getRepPersonsTags.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/persons/tags
     * @remarks Documented query: filters (extra keys allowed).
     */
    getRepPersonsTags(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/persons/tags', { query: opts.query });
    }

    /**
     * getCharges.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/plans/charges
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCharges(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/plans/charges', { query: opts.query });
    }

    /**
     * getChargesPartners.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/plans/charges-partners
     * @remarks Documented query: filters (extra keys allowed).
     */
    getChargesPartners(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/plans/charges-partners', { query: opts.query });
    }

    /**
     * getChargesV2.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/plans/charges-v2
     * @remarks Documented query: filters (extra keys allowed).
     */
    getChargesV2(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/plans/charges-v2', { query: opts.query });
    }

    /**
     * getChargesV3.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/plans/charges-v3
     * @remarks Documented query: filters (extra keys allowed).
     */
    getChargesV3(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/plans/charges-v3', { query: opts.query });
    }

    /**
     * getHistory.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/plans/history
     * @remarks Documented query: filters (extra keys allowed).
     */
    getHistory(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/plans/history', { query: opts.query });
    }

    /**
     * getPrices.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/plans/prices
     * @remarks Documented query: filters (extra keys allowed).
     */
    getPrices(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/plans/prices', { query: opts.query });
    }

    /**
     * getPlanResume.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/plans/resume
     * @remarks Documented query: filters (extra keys allowed).
     */
    getPlanResume(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/plans/resume', { query: opts.query });
    }

    /**
     * count.
     * @method POST /v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/count
     * @remarks Any query params may be sent (none documented).
     */
    count(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/count', { body, query: opts.query });
    }

    /**
     * emailStats.
     * @method POST /v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/email-stats
     * @remarks Any query params may be sent (none documented).
     */
    emailStats(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/email-stats', { body, query: opts.query });
    }

    /**
     * getDymamicSegmentations.
     * @method POST /v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/list
     * @remarks Any query params may be sent (none documented).
     */
    getDymamicSegmentations(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/list', { body, query: opts.query });
    }

    /**
     * messageStats.
     * @method POST /v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/message-stats
     * @remarks Any query params may be sent (none documented).
     */
    messageStats(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/message-stats', { body, query: opts.query });
    }

    /**
     * getQueryBuilder.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/query-builder
     * @remarks Any query params may be sent (none documented).
     */
    getQueryBuilder(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/query-builder', { query: opts.query });
    }

    /**
     * getAttendanceTotalTime.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/attendance-total-time
     * @remarks Documented query: filters (extra keys allowed).
     */
    getAttendanceTotalTime(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/attendance-total-time', { query: opts.query });
    }

    /**
     * getBotAverageTime.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/bot-average-time
     * @remarks Documented query: filters (extra keys allowed).
     */
    getBotAverageTime(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/bot-average-time', { query: opts.query });
    }

    /**
     * getBotAverageTimeMonth.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/bot-average-time-month
     * @remarks Documented query: filters (extra keys allowed).
     */
    getBotAverageTimeMonth(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/bot-average-time-month', { query: opts.query });
    }

    /**
     * getBotAverageTimeMonthSectors.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/bot-average-time-month-sectors
     * @remarks Documented query: filters (extra keys allowed).
     */
    getBotAverageTimeMonthSectors(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/bot-average-time-month-sectors', { query: opts.query });
    }

    /**
     * getFirstResponseTime.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/first-response-time
     * @remarks Documented query: filters (extra keys allowed).
     */
    getFirstResponseTime(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/first-response-time', { query: opts.query });
    }

    /**
     * getRepServicesMonthlyHistory.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/monthly-history
     * @remarks Documented query: filters (extra keys allowed).
     */
    getRepServicesMonthlyHistory(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/monthly-history', { query: opts.query });
    }

    /**
     * getQueueAverageTime.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/queue-average-time
     * @remarks Documented query: filters (extra keys allowed).
     */
    getQueueAverageTime(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/queue-average-time', { query: opts.query });
    }

    /**
     * getQueueAverageTimeMonth.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/queue-average-time-month
     * @remarks Documented query: filters (extra keys allowed).
     */
    getQueueAverageTimeMonth(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/queue-average-time-month', { query: opts.query });
    }

    /**
     * getQueueAverageTimeMonthSectors.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/queue-average-time-month-sectors
     * @remarks Documented query: filters (extra keys allowed).
     */
    getQueueAverageTimeMonthSectors(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/queue-average-time-month-sectors', { query: opts.query });
    }

    /**
     * getRepServicesReasons.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/reasons
     * @remarks Documented query: filters (extra keys allowed).
     */
    getRepServicesReasons(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/reasons', { query: opts.query });
    }

    /**
     * getServicesConsolidatedMetrics.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/services-consolidated-metrics
     * @remarks Documented query: query (extra keys allowed).
     */
    getServicesConsolidatedMetrics(opts: { query?: { query?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/services-consolidated-metrics', { query: opts.query });
    }

    /**
     * getServicesCount.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/services-count
     * @remarks Documented query: filters (extra keys allowed).
     */
    getServicesCount(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/services-count', { query: opts.query });
    }

    /**
     * getServicesUserMetrics.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/services-user-metrics
     * @remarks Documented query: filters (extra keys allowed).
     */
    getServicesUserMetrics(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/services-user-metrics', { query: opts.query });
    }

    /**
     * getServicesUserWeeklyCount.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/services-user-weekly-count
     * @remarks Documented query: filters (extra keys allowed).
     */
    getServicesUserWeeklyCount(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/services-user-weekly-count', { query: opts.query });
    }

    /**
     * getRepServicesTags.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/tags
     * @remarks Documented query: filters (extra keys allowed).
     */
    getRepServicesTags(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/services/tags', { query: opts.query });
    }

    /**
     * getRepSessionsMonthlyHistory.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/sessions/monthly-history
     * @remarks Documented query: filters (extra keys allowed).
     */
    getRepSessionsMonthlyHistory(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/sessions/monthly-history', { query: opts.query });
    }

    /**
     * getMonthlyTwoway.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/sessions/monthly-twoway
     * @remarks Documented query: filters (extra keys allowed).
     */
    getMonthlyTwoway(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/sessions/monthly-twoway', { query: opts.query });
    }

    /**
     * getRepSessionsResume.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/sessions/resume
     * @remarks Any query params may be sent (none documented).
     */
    getRepSessionsResume(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/sessions/resume', { query: opts.query });
    }

    /**
     * getUserIndicators.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/tasks/user-indicators
     * @remarks Documented query: filters (extra keys allowed).
     */
    getUserIndicators(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/tasks/user-indicators', { query: opts.query });
    }

    /**
     * getUserSectorIndicators.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/tasks/user-sector-indicators
     * @remarks Documented query: filters (extra keys allowed).
     */
    getUserSectorIndicators(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/tasks/user-sector-indicators', { query: opts.query });
    }

    /**
     * getUsersSummary.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/tasks/users-summary
     * @remarks Documented query: filters (extra keys allowed).
     */
    getUsersSummary(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/tasks/users-summary', { query: opts.query });
    }

    /**
     * Get all consolidated sectors users.
     * @method GET /v1/workspaces/{workspace_id}/reports/services/consolidated/sectors-users
     * @remarks Documented query: query, page, limit, connection, user, sector, start_date, end_date (extra keys allowed).
     */
    getSectorsUsers(opts: { query?: { query?: string; page?: number; limit?: number; connection?: string; user?: string; sector?: string; start_date?: string; end_date?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/services/consolidated/sectors-users', { query: opts.query });
    }

    /**
     * Get all dashboard counters.
     * @method GET /v1/workspaces/{workspace_id}/reports/services/dashboard/counters
     * @remarks Documented query: filters, user, sector, connection (extra keys allowed).
     */
    getCounters(opts: { query?: { filters?: string; user?: string; sector?: string; connection?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/services/dashboard/counters', { query: opts.query });
    }

    /**
     * Get all dashboard users counters.
     * @method GET /v1/workspaces/{workspace_id}/reports/services/dashboard/users-counters
     * @remarks Documented query: page, limit, user, sector, connection, is_available, is_available_to_call (extra keys allowed).
     */
    getUsersCounters(opts: { query?: { page?: number; limit?: number; user?: string; sector?: string; connection?: string; is_available?: boolean; is_available_to_call?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/services/dashboard/users-counters', { query: opts.query });
    }

    /**
     * Get all reports from me.
     * @method GET /v1/workspaces/{workspace_id}/reports/services/summary/me
     * @remarks Documented query: page, limit, connection, user, sector, start_date, end_date, field_date (extra keys allowed).
     */
    ReportsController_getAllMe_v1(opts: { query?: { page?: string; limit?: number; connection?: string; user?: string; sector?: string; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/services/summary/me', { query: opts.query });
    }

    /**
     * getSectors.
     * @method GET /v1/workspaces/{workspace_id}/reports/alloy-reports/sectors
     * @remarks Documented query: filters (extra keys allowed).
     */
    getSectors(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/alloy-reports/sectors', { query: opts.query });
    }

    /**
     * Get csat.
     * @method GET /v1/workspaces/{workspace_id}/reports/services/csat
     * @remarks Documented query: filters, page, limit, connection, user, sector, start_date, end_date, field_date (extra keys allowed).
     */
    getCsat(opts: { query?: { filters?: string; page?: string; limit?: number; connection?: string; user?: string; sector?: string; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/services/csat', { query: opts.query });
    }

    /**
     * Get all reports.
     * @method GET /v1/workspaces/{workspace_id}/reports/services/summary
     * @remarks Documented query: filters, page, limit, connection, user, sector, start_date, end_date, field_date (extra keys allowed).
     */
    getReports(opts: { query?: { filters?: string; page?: string; limit?: number; connection?: string; user?: string; sector?: string; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/services/summary', { query: opts.query });
    }

    /**
     * Get services counters by tag.
     * @method GET /v1/workspaces/{workspace_id}/reports/services/tags
     * @remarks Documented query: page, limit, connection, user, sector, start_date, end_date, field_date (extra keys allowed).
     */
    ReportsController_getServicesCountersByTag_v1(opts: { query?: { page?: string; limit?: number; connection?: string; user?: string; sector?: string; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/services/tags', { query: opts.query });
    }

    /**
     * Get all messages templates report.
     * @method GET /v1/workspaces/{workspace_id}/reports/templates/{id}
     * @remarks Documented query: page, limit, order, direction_order, to, from, person, campaign, populate, created_at (extra keys allowed).
     */
    getTemplate(id: string, opts: { query?: { page?: number; limit?: number; order?: string; direction_order?: string; to?: string; from?: string; person?: string; campaign?: string; populate?: string[]; created_at?: unknown } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/reports/templates/{id}', { path: { id }, query: opts.query });
    }
}
