import { Resource } from './base';
import type { Paged } from '../core/types';

/** An automation flow. */
export interface Flow {
    id: string;
    name?: string;
    type?: string;
    workspace?: string;
    user?: string;
    is_enable?: boolean;
    triggers?: unknown;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    user_id?: string;
    [key: string]: unknown;
}

/** `flows` resource (generated from openapi.json). */
export class Flows extends Resource {
    /**
     * executeNode.
     * @method POST /v1/workspaces/{workspace_id}/flows/{flow_id}/execute-node
     * @remarks Any query params may be sent (none documented).
     */
    executeNode(flowId: string, body: Partial<Flow>, opts: { query?: Record<string, unknown> } = {}): Promise<Flow> {
        return this.http.post('/v1/workspaces/{workspace_id}/flows/{flow_id}/execute-node', { path: { flow_id: flowId }, body, query: opts.query });
    }

    /**
     * install.
     * @method POST /v1/workspaces/{workspace_id}/flows/{flow_id}/install
     * @remarks Any query params may be sent (none documented).
     */
    install(flowId: string, body: Partial<Flow>, opts: { query?: Record<string, unknown> } = {}): Promise<Flow> {
        return this.http.post('/v1/workspaces/{workspace_id}/flows/{flow_id}/install', { path: { flow_id: flowId }, body, query: opts.query });
    }

    /**
     * makePublic.
     * @method POST /v1/workspaces/{workspace_id}/flows/{flow_id}/make-public
     * @remarks Any query params may be sent (none documented).
     */
    makePublic(flowId: string, body: Partial<Flow>, opts: { query?: Record<string, unknown> } = {}): Promise<Flow> {
        return this.http.post('/v1/workspaces/{workspace_id}/flows/{flow_id}/make-public', { path: { flow_id: flowId }, body, query: opts.query });
    }

    /**
     * publish.
     * @method POST /v1/workspaces/{workspace_id}/flows/{flow_id}/publish
     * @remarks Any query params may be sent (none documented).
     */
    publish(flowId: string, body: Partial<Flow>, opts: { query?: Record<string, unknown> } = {}): Promise<Flow> {
        return this.http.post('/v1/workspaces/{workspace_id}/flows/{flow_id}/publish', { path: { flow_id: flowId }, body, query: opts.query });
    }

    /**
     * getVersion.
     * @method GET /v1/workspaces/{workspace_id}/flows/{flow_id}/version
     * @remarks Documented query: filters (extra keys allowed).
     */
    getVersion(flowId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Flow>> {
        return this.http.get('/v1/workspaces/{workspace_id}/flows/{flow_id}/version', { path: { flow_id: flowId }, query: opts.query });
    }

    /**
     * deleteFlow.
     * @method DELETE /v1/workspaces/{workspace_id}/flows/{flow_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteFlow(flowId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/flows/{flow_id}', { path: { flow_id: flowId }, query: opts.query });
    }

    /**
     * getFlow.
     * @method GET /v1/workspaces/{workspace_id}/flows/{flow_id}
     * @remarks Any query params may be sent (none documented).
     */
    getFlow(flowId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Flow> {
        return this.http.get('/v1/workspaces/{workspace_id}/flows/{flow_id}', { path: { flow_id: flowId }, query: opts.query });
    }

    /**
     * updateFlow.
     * @method PUT /v1/workspaces/{workspace_id}/flows/{flow_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateFlow(flowId: string, body: Partial<Flow>, opts: { query?: Record<string, unknown> } = {}): Promise<Flow> {
        return this.http.put('/v1/workspaces/{workspace_id}/flows/{flow_id}', { path: { flow_id: flowId }, body, query: opts.query });
    }

    /**
     * getPublic.
     * @method GET /v1/workspaces/{workspace_id}/flows/public
     * @remarks Documented query: filters (extra keys allowed).
     */
    getPublic(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Flow>> {
        return this.http.get('/v1/workspaces/{workspace_id}/flows/public', { query: opts.query });
    }

    /**
     * listFlows.
     * @method GET /v1/workspaces/{workspace_id}/flows
     * @remarks Documented query: filters (extra keys allowed).
     */
    listFlows(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Flow>> {
        return this.http.get('/v1/workspaces/{workspace_id}/flows', { query: opts.query });
    }

    /**
     * createFlow.
     * @method POST /v1/workspaces/{workspace_id}/flows
     * @remarks Any query params may be sent (none documented).
     */
    createFlow(body: Partial<Flow>, opts: { query?: Record<string, unknown> } = {}): Promise<Flow> {
        return this.http.post('/v1/workspaces/{workspace_id}/flows', { body, query: opts.query });
    }
}
