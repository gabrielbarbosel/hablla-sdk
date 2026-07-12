import { Resource } from './base';

/** `scripts` resource (generated from openapi.json). */
export class Scripts extends Resource {
    /**
     * scriptExecution.
     * @method POST /v1/workspaces/{workspace_id}/scripts/{script_id}/execution
     * @remarks Any query params may be sent (none documented).
     */
    scriptExecution(scriptId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/scripts/{script_id}/execution', { path: { script_id: scriptId }, body, query: opts.query });
    }

    /**
     * deleteScript.
     * @method DELETE /v1/workspaces/{workspace_id}/scripts/{script_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteScript(scriptId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/scripts/{script_id}', { path: { script_id: scriptId }, query: opts.query });
    }

    /**
     * getScript.
     * @method GET /v1/workspaces/{workspace_id}/scripts/{script_id}
     * @remarks Any query params may be sent (none documented).
     */
    getScript(scriptId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/scripts/{script_id}', { path: { script_id: scriptId }, query: opts.query });
    }

    /**
     * updateScript.
     * @method PUT /v1/workspaces/{workspace_id}/scripts/{script_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateScript(scriptId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/scripts/{script_id}', { path: { script_id: scriptId }, body, query: opts.query });
    }

    /**
     * runCode.
     * @method POST /v1/workspaces/{workspace_id}/scripts/execution
     * @remarks Any query params may be sent (none documented).
     */
    runCode(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/scripts/execution', { body, query: opts.query });
    }

    /**
     * listScripts.
     * @method GET /v1/workspaces/{workspace_id}/scripts
     * @remarks Documented query: filters (extra keys allowed).
     */
    listScripts(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/scripts', { query: opts.query });
    }

    /**
     * createScript.
     * @method POST /v1/workspaces/{workspace_id}/scripts
     * @remarks Any query params may be sent (none documented).
     */
    createScript(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/scripts', { body, query: opts.query });
    }
}
