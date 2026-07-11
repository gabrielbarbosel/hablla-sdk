import { Resource } from './base';
import type { Paged } from '../core/types';

/** A flow execution run. */
export interface FlowsExecution {
    id: string;
    key?: string;
    workspace?: string;
    connection?: string;
    person?: string;
    service?: string;
    flow?: string;
    flow_version?: string;
    status?: string;
    tags?: unknown;
    is_test?: boolean;
    created_at?: string;
    updated_at?: string;
    error_data?: unknown;
    workspace_id?: string;
    flow_id?: string;
    flow_version_id?: string;
    person_id?: string;
    [key: string]: unknown;
}

/** `flows-executions` resource (generated from openapi.json). */
export class FlowsExecutions extends Resource {
    /**
     * retryExecution.
     * @method POST /v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}/retry
     * @remarks Any query params may be sent (none documented).
     */
    retryExecution(flowsExecutionId: string, body: Partial<FlowsExecution>, opts: { query?: Record<string, unknown> } = {}): Promise<FlowsExecution> {
        return this.http.post('/v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}/retry', { path: { flows_execution_id: flowsExecutionId }, body, query: opts.query });
    }

    /**
     * stop.
     * @method POST /v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}/stop
     * @remarks Any query params may be sent (none documented).
     */
    stop(flowsExecutionId: string, body: Partial<FlowsExecution>, opts: { query?: Record<string, unknown> } = {}): Promise<FlowsExecution> {
        return this.http.post('/v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}/stop', { path: { flows_execution_id: flowsExecutionId }, body, query: opts.query });
    }

    /**
     * getFlowsExecution.
     * @method GET /v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}
     * @remarks Any query params may be sent (none documented).
     */
    getFlowsExecution(flowsExecutionId: string, opts: { query?: Record<string, unknown> } = {}): Promise<FlowsExecution> {
        return this.http.get('/v1/workspaces/{workspace_id}/flows-executions/{flows_execution_id}', { path: { flows_execution_id: flowsExecutionId }, query: opts.query });
    }

    /**
     * retryMultipleExecutions.
     * @method POST /v1/workspaces/{workspace_id}/flows-executions/retry
     * @remarks Any query params may be sent (none documented).
     */
    retryMultipleExecutions(body: Partial<FlowsExecution>, opts: { query?: Record<string, unknown> } = {}): Promise<FlowsExecution> {
        return this.http.post('/v1/workspaces/{workspace_id}/flows-executions/retry', { body, query: opts.query });
    }

    /**
     * listFlowsExecutions.
     * @method GET /v1/workspaces/{workspace_id}/flows-executions
     * @remarks Documented query: filters (extra keys allowed).
     */
    listFlowsExecutions(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<FlowsExecution>> {
        return this.http.get('/v1/workspaces/{workspace_id}/flows-executions', { query: opts.query });
    }
}
