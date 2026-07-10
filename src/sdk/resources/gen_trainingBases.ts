import { Resource } from './base';

/** `training-bases` resource (generated from openapi.json). */
export class TrainingBases extends Resource {
    /**
     * deleteTrainingBase.
     * @method DELETE /v1/workspaces/{workspace_id}/training-bases/{training_base_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteTrainingBase(trainingBaseId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/training-bases/{training_base_id}', { path: { training_base_id: trainingBaseId }, query: opts.query });
    }

    /**
     * getTrainingBase.
     * @method GET /v1/workspaces/{workspace_id}/training-bases/{training_base_id}
     * @remarks Any query params may be sent (none documented).
     */
    getTrainingBase(trainingBaseId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/training-bases/{training_base_id}', { path: { training_base_id: trainingBaseId }, query: opts.query });
    }

    /**
     * listTrainingBases.
     * @method GET /v1/workspaces/{workspace_id}/training-bases
     * @remarks Documented query: filters (extra keys allowed).
     */
    listTrainingBases(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/training-bases', { query: opts.query });
    }

    /**
     * createTrainingBase.
     * @method POST /v1/workspaces/{workspace_id}/training-bases
     * @remarks Any query params may be sent (none documented).
     */
    createTrainingBase(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/training-bases', { body, query: opts.query });
    }

    /**
     * updateTrainingBase.
     * @method PUT /v1/workspaces/{workspace_id}/training-bases
     * @remarks Any query params may be sent (none documented).
     */
    updateTrainingBase(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/training-bases', { body, query: opts.query });
    }
}
