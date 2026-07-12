import { Resource } from './base';

/** `flows-executions` resource (generated from openapi.json). */
export class FlowsExecutions extends Resource {
    /**
     * retryExecution.
     * @method POST /v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}/retry
     * @remarks Any query params may be sent (none documented).
     */
    retryExecution(flowsExecutionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}/retry', { path: { flows_execution_id: flowsExecutionId }, body, query: opts.query });
    }

    /**
     * stop.
     * @method POST /v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}/stop
     * @remarks Any query params may be sent (none documented).
     */
    stop(flowsExecutionId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}/stop', { path: { flows_execution_id: flowsExecutionId }, body, query: opts.query });
    }

    /**
     * getFlowsExecution.
     * @method GET /v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}
     * @remarks Any query params may be sent (none documented).
     */
    getFlowsExecution(flowsExecutionId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}', { path: { flows_execution_id: flowsExecutionId }, query: opts.query });
    }

    /**
     * retryMultipleExecutions.
     * @method POST /v1/workspaces/{workspace_id}/flows-executions/retry
     * @remarks Any query params may be sent (none documented).
     */
    retryMultipleExecutions(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/flows-executions/retry', { body, query: opts.query });
    }

    /**
     * listFlowsExecutions.
     * @method GET /v1/workspaces/{workspace_id}/flows-executions
     * @remarks Documented query: filters (extra keys allowed).
     */
    listFlowsExecutions(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/flows-executions', { query: opts.query });
    }
}
