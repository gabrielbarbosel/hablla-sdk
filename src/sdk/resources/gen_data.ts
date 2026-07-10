import { Resource } from './base';

/** `data` resource (generated from openapi.json). */
export class Data extends Resource {
    /**
     * deleteData.
     * @method DELETE /v2/workspaces/{workspace_id}/data/{data_id}/{data2_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteData(dataId: string, data2Id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v2/workspaces/{workspace_id}/data/{data_id}/{data2_id}', { path: { data_id: dataId, data2_id: data2Id }, query: opts.query });
    }

    /**
     * getDataById.
     * @method GET /v2/workspaces/{workspace_id}/data/{data_id}/{data2_id}
     * @remarks Any query params may be sent (none documented).
     */
    getDataById(dataId: string, data2Id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v2/workspaces/{workspace_id}/data/{data_id}/{data2_id}', { path: { data_id: dataId, data2_id: data2Id }, query: opts.query });
    }

    /**
     * updateData.
     * @method PUT /v2/workspaces/{workspace_id}/data/{data_id}/{data2_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateData(dataId: string, data2Id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v2/workspaces/{workspace_id}/data/{data_id}/{data2_id}', { path: { data_id: dataId, data2_id: data2Id }, body, query: opts.query });
    }

    /**
     * getData.
     * @method GET /v2/workspaces/{workspace_id}/data/{data_id}
     * @remarks Documented query: filters (extra keys allowed).
     */
    getData(dataId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v2/workspaces/{workspace_id}/data/{data_id}', { path: { data_id: dataId }, query: opts.query });
    }

    /**
     * createData.
     * @method POST /v2/workspaces/{workspace_id}/data/{data_id}
     * @remarks Any query params may be sent (none documented).
     */
    createData(dataId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v2/workspaces/{workspace_id}/data/{data_id}', { path: { data_id: dataId }, body, query: opts.query });
    }
}
