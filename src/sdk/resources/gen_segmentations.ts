import { Resource } from './base';

/** `segmentations` resource (generated from openapi.json). */
export class Segmentations extends Resource {
    /**
     * Delete segmentation by id.
     * @method DELETE /v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items/{segmentations_item_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSegmentationsItems(segmentationId: string, segmentationsItemId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items/{segmentations_item_id}', { path: { segmentation_id: segmentationId, segmentations_item_id: segmentationsItemId }, query: opts.query });
    }

    /**
     * Get segmentation by id.
     * @method GET /v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items/{segmentations_item_id}
     * @remarks Documented query: filters, populate (extra keys allowed).
     */
    getSegmentationsItem(segmentationId: string, segmentationsItemId: string, opts: { query?: { filters?: string; populate?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items/{segmentations_item_id}', { path: { segmentation_id: segmentationId, segmentations_item_id: segmentationsItemId }, query: opts.query });
    }

    /**
     * Get all segmentations items.
     * @method GET /v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items
     * @remarks Documented query: filters, page, limit, order, direction_order, populate, search (extra keys allowed).
     */
    getSegmentationsItems(segmentationId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; populate?: string[]; search?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items', { path: { segmentation_id: segmentationId }, query: opts.query });
    }

    /**
     * Create a new segmentation item.
     * @method POST /v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items
     * @remarks Documented query: populate (extra keys allowed).
     */
    segmentationsItems(segmentationId: string, body: Record<string, unknown>, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items', { path: { segmentation_id: segmentationId }, body, query: opts.query });
    }

    /**
     * Delete segmentation by id.
     * @method DELETE /v1/workspaces/{workspace_id}/segmentations/{segmentation_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSegmentation(segmentationId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}', { path: { segmentation_id: segmentationId }, query: opts.query });
    }

    /**
     * Get segmentation by id.
     * @method GET /v1/workspaces/{workspace_id}/segmentations/{segmentation_id}
     * @remarks Any query params may be sent (none documented).
     */
    getSegmentation(segmentationId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}', { path: { segmentation_id: segmentationId }, query: opts.query });
    }

    /**
     * Update segmentation by id.
     * @method PUT /v1/workspaces/{workspace_id}/segmentations/{segmentation_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateSegmentation(segmentationId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}', { path: { segmentation_id: segmentationId }, body, query: opts.query });
    }

    /**
     * Get all segmentations.
     * @method GET /v1/workspaces/{workspace_id}/segmentations
     * @remarks Documented query: filters, page, limit, order, direction_order, name, is_enable, type, result_type (extra keys allowed).
     */
    listSegmentations(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; is_enable?: boolean; type?: string; result_type?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/segmentations', { query: opts.query });
    }

    /**
     * Create a new segmentation.
     * @method POST /v1/workspaces/{workspace_id}/segmentations
     * @remarks Any query params may be sent (none documented).
     */
    createSegmentation(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/segmentations', { body, query: opts.query });
    }
}
