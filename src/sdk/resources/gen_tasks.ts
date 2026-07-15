import { Resource } from './base';
import type { Paged } from '../core/types';
import type { TaskStatusCode, TaskTypeCode } from './gen_enums';

/** A task. */
export interface Task {
    id: string;
    workspace?: string;
    person?: string;
    user?: string;
    created_by_user?: string;
    name?: string;
    type?: string;
    color?: string;
    status?: string;
    task_total_time?: number;
    start_date?: string;
    finish_date?: string;
    prediction_time?: number;
    billable?: boolean;
    approval?: boolean;
    checklist?: unknown;
    task_times?: unknown;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    sector_id?: unknown;
    organization_id?: unknown;
    person_id?: string;
    card_id?: unknown;
    service_id?: unknown;
    user_id?: string;
    created_by_user_id?: string;
    approval_by?: unknown;
    [key: string]: unknown;
}

/** `tasks` resource (generated from openapi.json). */
export class Tasks extends Resource {
    /**
     * Delete checklist item by id.
     * @method DELETE /v1/workspaces/{workspace_id}/tasks/{task_id}/checklist/{checklist_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteChecklist(taskId: string, checklistId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/tasks/{task_id}/checklist/{checklist_id}', { path: { task_id: taskId, checklist_id: checklistId }, query: opts.query });
    }

    /**
     * Update checklist item on tag by id.
     * @method PUT /v1/workspaces/{workspace_id}/tasks/{task_id}/checklist/{checklist_id}
     * @remarks Any query params may be sent (none documented).
     */
    putChecklist(taskId: string, checklistId: string, body: Partial<Task>, opts: { query?: Record<string, unknown> } = {}): Promise<Task> {
        return this.http.put('/v1/workspaces/{workspace_id}/tasks/{task_id}/checklist/{checklist_id}', { path: { task_id: taskId, checklist_id: checklistId }, body, query: opts.query });
    }

    /**
     * Approve (give acceptance to) a service-team task.
     * @method PUT /v1/workspaces/{workspace_id}/tasks/{task_id}/approval
     * @remarks Any query params may be sent (none documented).
     */
    putApproval(taskId: string, body: Partial<Task>, opts: { query?: Record<string, unknown> } = {}): Promise<Task> {
        return this.http.put('/v1/workspaces/{workspace_id}/tasks/{task_id}/approval', { path: { task_id: taskId }, body, query: opts.query });
    }

    /**
     * Add checklist item to task by id.
     * @method POST /v1/workspaces/{workspace_id}/tasks/{task_id}/checklist
     * @remarks Any query params may be sent (none documented).
     */
    checklist(taskId: string, body: Partial<Task>, opts: { query?: Record<string, unknown> } = {}): Promise<Task> {
        return this.http.post('/v1/workspaces/{workspace_id}/tasks/{task_id}/checklist', { path: { task_id: taskId }, body, query: opts.query });
    }

    /**
     * Delete task by id.
     * @method DELETE /v1/workspaces/{workspace_id}/tasks/{task_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteTask(taskId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/tasks/{task_id}', { path: { task_id: taskId }, query: opts.query });
    }

    /**
     * Get task by id.
     * @method GET /v1/workspaces/{workspace_id}/tasks/{task_id}
     * @remarks Documented query: populate (extra keys allowed).
     */
    getTask(taskId: string, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Task> {
        return this.http.get('/v1/workspaces/{workspace_id}/tasks/{task_id}', { path: { task_id: taskId }, query: opts.query });
    }

    /**
     * Update task by id.
     * @method PUT /v1/workspaces/{workspace_id}/tasks/{task_id}
     * @remarks Documented query: populate (extra keys allowed).
     */
    updateTask(taskId: string, body: Partial<Task>, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Task> {
        return this.http.put('/v1/workspaces/{workspace_id}/tasks/{task_id}', { path: { task_id: taskId }, body, query: opts.query });
    }

    /**
     * Get all tasks created by the service team for this client's organization.
     * @method GET /v1/workspaces/{workspace_id}/tasks/approvals
     * @remarks Documented query: filters, page, limit, order, direction_order, person, card, service, organization, sector, user, created_by_user, name, description, status, type, start_date, finish_date, no_date, has_start_date, populate, statuses, billable, approval (extra keys allowed).
     */
    getApprovals(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; person?: string; card?: string; service?: string; organization?: string; sector?: string; user?: string; created_by_user?: string; name?: string; description?: string; status?: TaskStatusCode; type?: TaskTypeCode; start_date?: string; finish_date?: string; no_date?: boolean; has_start_date?: boolean; populate?: string[]; statuses?: string[]; billable?: boolean; approval?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Task>> {
        return this.http.get('/v1/workspaces/{workspace_id}/tasks/approvals', { query: opts.query });
    }

    /**
     * Get all tasks.
     * @method GET /v1/workspaces/{workspace_id}/tasks
     * @remarks Documented query: filters, page, limit, order, direction_order, person, card, service, organization, sector, user, created_by_user, name, description, status, type, start_date, finish_date, no_date, has_start_date, populate, statuses, billable, approval (extra keys allowed).
     */
    listTasksV1(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; person?: string; card?: string; service?: string; organization?: string; sector?: string; user?: string; created_by_user?: string; name?: string; description?: string; status?: TaskStatusCode; type?: TaskTypeCode; start_date?: string; finish_date?: string; no_date?: boolean; has_start_date?: boolean; populate?: string[]; statuses?: string[]; billable?: boolean; approval?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Task>> {
        return this.http.get('/v1/workspaces/{workspace_id}/tasks', { query: opts.query });
    }

    /**
     * Create a task.
     * @method POST /v1/workspaces/{workspace_id}/tasks
     * @remarks Documented query: populate (extra keys allowed).
     */
    createTask(body: Partial<Task>, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Task> {
        return this.http.post('/v1/workspaces/{workspace_id}/tasks', { body, query: opts.query });
    }

    /**
     * Get all tasks v2.
     * @method GET /v2/workspaces/{workspace_id}/tasks
     * @remarks Documented query: filters, page, limit, order, direction_order, person, card, service, organization, sector, user, created_by_user, name, description, status, type, start_date, finish_date, no_date, has_start_date, populate, statuses, billable, approval (extra keys allowed).
     */
    listTasks(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; person?: string; card?: string; service?: string; organization?: string; sector?: string; user?: string; created_by_user?: string; name?: string; description?: string; status?: TaskStatusCode; type?: TaskTypeCode; start_date?: string; finish_date?: string; no_date?: boolean; has_start_date?: boolean; populate?: string[]; statuses?: string[]; billable?: boolean; approval?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Task>> {
        return this.http.get('/v2/workspaces/{workspace_id}/tasks', { query: opts.query });
    }
}
