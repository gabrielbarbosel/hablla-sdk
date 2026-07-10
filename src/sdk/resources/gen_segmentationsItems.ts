import { Resource } from './base';

/** `segmentations-items` resource (generated from openapi.json). */
export class SegmentationsItems extends Resource {
    /**
     * Delete segmentation by id.
     * @method DELETE /v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSegmentationsItem(segmentationId: string, id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items/{id}', { path: { segmentation_id: segmentationId, id }, query: opts.query });
    }

    /**
     * Get segmentation by id.
     * @method GET /v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items/{id}
     * @remarks Documented query: filters, populate (extra keys allowed).
     */
    getSegmentationsItem(segmentationId: string, id: string, opts: { query?: { filters?: string; populate?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items/{id}', { path: { segmentation_id: segmentationId, id }, query: opts.query });
    }

    /**
     * Get all segmentations items.
     * @method GET /v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items
     * @remarks Documented query: filters, page, limit, order, direction_order, populate, search (extra keys allowed).
     */
    listSegmentationsItems(segmentationId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; populate?: string[]; search?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items', { path: { segmentation_id: segmentationId }, query: opts.query });
    }

    /**
     * Create a new segmentation item.
     * @method POST /v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items
     * @remarks Documented query: populate (extra keys allowed).
     */
    createSegmentationsItem(segmentationId: string, body: Record<string, unknown>, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/segmentations/{segmentation_id}/segmentations-items', { path: { segmentation_id: segmentationId }, body, query: opts.query });
    }
}
