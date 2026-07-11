import { Resource } from './base';

/** `cost-centers` resource (generated from openapi.json). */
export class CostCenters extends Resource {
    /**
     * deleteCostAllocations.
     * @method DELETE /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}/cost-allocations/{cost_allocation_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteCostAllocations(costCenterId: string, costEntryId: string, costAllocationId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}/cost-allocations/{cost_allocation_id}', { path: { cost_center_id: costCenterId, cost_entry_id: costEntryId, cost_allocation_id: costAllocationId }, query: opts.query });
    }

    /**
     * getCostAllocation.
     * @method GET /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}/cost-allocations/{cost_allocation_id}
     * @remarks Any query params may be sent (none documented).
     */
    getCostAllocation(costCenterId: string, costEntryId: string, costAllocationId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}/cost-allocations/{cost_allocation_id}', { path: { cost_center_id: costCenterId, cost_entry_id: costEntryId, cost_allocation_id: costAllocationId }, query: opts.query });
    }

    /**
     * putCostAllocations.
     * @method PUT /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}/cost-allocations/{cost_allocation_id}
     * @remarks Any query params may be sent (none documented).
     */
    putCostAllocations(costCenterId: string, costEntryId: string, costAllocationId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}/cost-allocations/{cost_allocation_id}', { path: { cost_center_id: costCenterId, cost_entry_id: costEntryId, cost_allocation_id: costAllocationId }, body, query: opts.query });
    }

    /**
     * getCostAllocations.
     * @method GET /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}/cost-allocations
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCostAllocations(costCenterId: string, costEntryId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}/cost-allocations', { path: { cost_center_id: costCenterId, cost_entry_id: costEntryId }, query: opts.query });
    }

    /**
     * costAllocations.
     * @method POST /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}/cost-allocations
     * @remarks Any query params may be sent (none documented).
     */
    costAllocations(costCenterId: string, costEntryId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}/cost-allocations', { path: { cost_center_id: costCenterId, cost_entry_id: costEntryId }, body, query: opts.query });
    }

    /**
     * deleteCostEntries.
     * @method DELETE /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteCostEntries(costCenterId: string, costEntryId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}', { path: { cost_center_id: costCenterId, cost_entry_id: costEntryId }, query: opts.query });
    }

    /**
     * getCostEntry.
     * @method GET /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}
     * @remarks Any query params may be sent (none documented).
     */
    getCostEntry(costCenterId: string, costEntryId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}', { path: { cost_center_id: costCenterId, cost_entry_id: costEntryId }, query: opts.query });
    }

    /**
     * putCostEntries.
     * @method PUT /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}
     * @remarks Any query params may be sent (none documented).
     */
    putCostEntries(costCenterId: string, costEntryId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries/{cost_entry_id}', { path: { cost_center_id: costCenterId, cost_entry_id: costEntryId }, body, query: opts.query });
    }

    /**
     * getCostEntries.
     * @method GET /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries
     * @remarks Documented query: filters (extra keys allowed).
     */
    getCostEntries(costCenterId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries', { path: { cost_center_id: costCenterId }, query: opts.query });
    }

    /**
     * costEntries.
     * @method POST /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries
     * @remarks Any query params may be sent (none documented).
     */
    costEntries(costCenterId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}/cost-entries', { path: { cost_center_id: costCenterId }, body, query: opts.query });
    }

    /**
     * deleteCostCenter.
     * @method DELETE /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteCostCenter(costCenterId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}', { path: { cost_center_id: costCenterId }, query: opts.query });
    }

    /**
     * getCostCenter.
     * @method GET /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}
     * @remarks Any query params may be sent (none documented).
     */
    getCostCenter(costCenterId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}', { path: { cost_center_id: costCenterId }, query: opts.query });
    }

    /**
     * updateCostCenter.
     * @method PUT /v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateCostCenter(costCenterId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/cost-centers/{cost_center_id}', { path: { cost_center_id: costCenterId }, body, query: opts.query });
    }

    /**
     * listCostCenters.
     * @method GET /v1/workspaces/{workspace_id}/cost-centers
     * @remarks Documented query: filters (extra keys allowed).
     */
    listCostCenters(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/cost-centers', { query: opts.query });
    }

    /**
     * createCostCenter.
     * @method POST /v1/workspaces/{workspace_id}/cost-centers
     * @remarks Any query params may be sent (none documented).
     */
    createCostCenter(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/cost-centers', { body, query: opts.query });
    }
}
