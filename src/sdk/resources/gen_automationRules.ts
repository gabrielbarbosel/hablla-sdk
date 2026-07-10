import { Resource } from './base';

/** An automation rule. */
export interface AutomationRule {
    id: string;
    [key: string]: unknown;
}

/** `automation-rules` resource (generated from openapi.json). */
export class AutomationRules extends Resource {
    /**
     * addFlow.
     * @method PATCH /v1/workspaces/{workspace_id}/automation-rules/{automation_rule_id}/add-flow
     * @remarks Any query params may be sent (none documented).
     */
    addFlow(automationRuleId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/automation-rules/{automation_rule_id}/add-flow', { path: { automation_rule_id: automationRuleId }, body, query: opts.query });
    }

    /**
     * removeFlow.
     * @method PATCH /v1/workspaces/{workspace_id}/automation-rules/{automation_rule_id}/remove-flow
     * @remarks Any query params may be sent (none documented).
     */
    removeFlow(automationRuleId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/automation-rules/{automation_rule_id}/remove-flow', { path: { automation_rule_id: automationRuleId }, body, query: opts.query });
    }

    /**
     * updateAutomationRule.
     * @method PUT /v1/workspaces/{workspace_id}/automation-rules/{automation_rule_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateAutomationRule(automationRuleId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/automation-rules/{automation_rule_id}', { path: { automation_rule_id: automationRuleId }, body, query: opts.query });
    }

    /**
     * getBoards.
     * @method GET /v1/workspaces/{workspace_id}/automation-rules/boards/{board_id}
     * @remarks Documented query: filters (extra keys allowed).
     */
    getBoards(boardId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/automation-rules/boards/{board_id}', { path: { board_id: boardId }, query: opts.query });
    }

    /**
     * createAutomationRule.
     * @method POST /v1/workspaces/{workspace_id}/automation-rules
     * @remarks Any query params may be sent (none documented).
     */
    createAutomationRule(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/automation-rules', { body, query: opts.query });
    }
}
