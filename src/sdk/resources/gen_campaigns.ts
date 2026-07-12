import { Resource } from './base';
import type { Paged, MultipartFile, MultipartBody } from '../core/types';

/** A campaign. */
export interface Campaign {
    id: string;
    workspace?: string;
    user?: string;
    type?: string;
    status?: string;
    name?: string;
    std_name?: string;
    quantity?: number;
    created_at?: string;
    updated_at?: string;
    processed_status?: unknown;
    workspace_id?: string;
    user_id?: string;
    [key: string]: unknown;
}

/** `campaigns` resource (generated from openapi.json). */
export class Campaigns extends Resource {
    /**
     * patchCancel.
     * @method PATCH /v1/workspaces/{workspace_id}/campaigns/{campaign_id}/cancel
     * @remarks Any query params may be sent (none documented).
     */
    patchCancel(campaignId: string, body: Partial<Campaign>, opts: { query?: Record<string, unknown> } = {}): Promise<Campaign> {
        return this.http.patch('/v1/workspaces/{workspace_id}/campaigns/{campaign_id}/cancel', { path: { campaign_id: campaignId }, body, query: opts.query });
    }

    /**
     * deleteCampaign.
     * @method DELETE /v1/workspaces/{workspace_id}/campaigns/{campaign_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteCampaign(campaignId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/campaigns/{campaign_id}', { path: { campaign_id: campaignId }, query: opts.query });
    }

    /**
     * getCampaign.
     * @method GET /v1/workspaces/{workspace_id}/campaigns/{campaign_id}
     * @remarks Any query params may be sent (none documented).
     */
    getCampaign(campaignId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Campaign> {
        return this.http.get('/v1/workspaces/{workspace_id}/campaigns/{campaign_id}', { path: { campaign_id: campaignId }, query: opts.query });
    }

    /**
     * updateCampaign.
     * @method PUT /v1/workspaces/{workspace_id}/campaigns/{campaign_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateCampaign(campaignId: string, body: Partial<Campaign>, opts: { query?: Record<string, unknown> } = {}): Promise<Campaign> {
        return this.http.put('/v1/workspaces/{workspace_id}/campaigns/{campaign_id}', { path: { campaign_id: campaignId }, body, query: opts.query });
    }

    /**
     * listCampaigns.
     * @method GET /v1/workspaces/{workspace_id}/campaigns
     * @remarks Documented query: filters (extra keys allowed).
     */
    listCampaigns(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Campaign>> {
        return this.http.get('/v1/workspaces/{workspace_id}/campaigns', { query: opts.query });
    }

    /**
     * sheet. Uploads an xlsx spreadsheet as multipart/form-data to create a campaign.
     * @method POST /v2/workspaces/{workspace_id}/campaigns/sheet
     * @remarks Any query params may be sent (none documented).
     * @param file The spreadsheet file part (sent under the `file` field).
     * @param fields Extra form-data text fields to send alongside the file.
     */
    sheet(file: MultipartFile, fields?: Record<string, string>, opts: { query?: Record<string, unknown> } = {}): Promise<Campaign> {
        const body: MultipartBody = { kind: 'multipart', fields, files: { file } };
        return this.http.post('/v2/workspaces/{workspace_id}/campaigns/sheet', { body, query: opts.query });
    }

    /**
     * createCampaign.
     * @method POST /v2/workspaces/{workspace_id}/campaigns
     * @remarks Any query params may be sent (none documented).
     */
    createCampaign(body: Partial<Campaign>, opts: { query?: Record<string, unknown> } = {}): Promise<Campaign> {
        return this.http.post('/v2/workspaces/{workspace_id}/campaigns', { body, query: opts.query });
    }
}
