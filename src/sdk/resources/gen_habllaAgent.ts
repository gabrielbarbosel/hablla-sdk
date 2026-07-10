import { Resource } from './base';

/** A Hablla agent. */
export interface HabllaAgent {
    id: string;
    name?: unknown;
    [key: string]: unknown;
}

/** `hablla-agent` resource (generated from openapi.json). */
export class HabllaAgent extends Resource {
    /**
     * listHistory.
     * @method GET /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/history
     * @remarks Documented query: filters (extra keys allowed).
     */
    listHistory(habllaAgentId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/history', { path: { hablla_agent_id: habllaAgentId }, query: opts.query });
    }

    /**
     * putRestore.
     * @method PUT /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/restore/{restore_id}
     * @remarks Any query params may be sent (none documented).
     */
    putRestore(habllaAgentId: string, restoreId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/restore/{restore_id}', { path: { hablla_agent_id: habllaAgentId, restore_id: restoreId }, body, query: opts.query });
    }

    /**
     * putHistory.
     * @method PUT /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill/{skill_id}/history/{history_id}
     * @remarks Any query params may be sent (none documented).
     */
    putHistory(habllaAgentId: string, skillId: string, historyId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill/{skill_id}/history/{history_id}', { path: { hablla_agent_id: habllaAgentId, skill_id: skillId, history_id: historyId }, body, query: opts.query });
    }

    /**
     * listSkillHistory.
     * @method GET /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill/{skill_id}/history
     * @remarks Documented query: filters (extra keys allowed).
     */
    listSkillHistory(habllaAgentId: string, skillId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill/{skill_id}/history', { path: { hablla_agent_id: habllaAgentId, skill_id: skillId }, query: opts.query });
    }

    /**
     * deleteSkill.
     * @method DELETE /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill/{skill_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSkill(habllaAgentId: string, skillId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill/{skill_id}', { path: { hablla_agent_id: habllaAgentId, skill_id: skillId }, query: opts.query });
    }

    /**
     * getSkill.
     * @method GET /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill/{skill_id}
     * @remarks Documented query: filters (extra keys allowed).
     */
    getSkill(habllaAgentId: string, skillId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill/{skill_id}', { path: { hablla_agent_id: habllaAgentId, skill_id: skillId }, query: opts.query });
    }

    /**
     * putSkill.
     * @method PUT /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill/{skill_id}
     * @remarks Any query params may be sent (none documented).
     */
    putSkill(habllaAgentId: string, skillId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill/{skill_id}', { path: { hablla_agent_id: habllaAgentId, skill_id: skillId }, body, query: opts.query });
    }

    /**
     * listSkill.
     * @method GET /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill
     * @remarks Documented query: filters (extra keys allowed).
     */
    listSkill(habllaAgentId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill', { path: { hablla_agent_id: habllaAgentId }, query: opts.query });
    }

    /**
     * skill.
     * @method POST /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill
     * @remarks Any query params may be sent (none documented).
     */
    skill(habllaAgentId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}/skill', { path: { hablla_agent_id: habllaAgentId }, body, query: opts.query });
    }

    /**
     * deleteHabllaAgent.
     * @method DELETE /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteHabllaAgent(habllaAgentId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}', { path: { hablla_agent_id: habllaAgentId }, query: opts.query });
    }

    /**
     * getHabllaAgent.
     * @method GET /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}
     * @remarks Any query params may be sent (none documented).
     */
    getHabllaAgent(habllaAgentId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}', { path: { hablla_agent_id: habllaAgentId }, query: opts.query });
    }

    /**
     * updateHabllaAgent.
     * @method PUT /v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateHabllaAgent(habllaAgentId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/hablla-agent/{hablla_agent_id}', { path: { hablla_agent_id: habllaAgentId }, body, query: opts.query });
    }

    /**
     * listHabllaAgent.
     * @method GET /v1/workspaces/{workspace_id}/hablla-agent
     * @remarks Documented query: filters (extra keys allowed).
     */
    listHabllaAgent(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/hablla-agent', { query: opts.query });
    }

    /**
     * createHabllaAgent.
     * @method POST /v1/workspaces/{workspace_id}/hablla-agent
     * @remarks Any query params may be sent (none documented).
     */
    createHabllaAgent(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/hablla-agent', { body, query: opts.query });
    }
}
