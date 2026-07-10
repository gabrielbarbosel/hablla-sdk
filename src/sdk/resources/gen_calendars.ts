import { Resource } from './base';

/** `calendars` resource (generated from openapi.json). */
export class Calendars extends Resource {
    /**
     * listAvailabilityByCalendar.
     * @method GET /v1/workspaces/{workspace_id}/calendars/{calendar_id}/availability
     * @remarks Any query params may be sent (none documented).
     */
    listAvailabilityByCalendar(calendarId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/calendars/{calendar_id}/availability', { path: { calendar_id: calendarId }, query: opts.query });
    }

    /**
     * deleteBlockedDays.
     * @method DELETE /v1/workspaces/{workspace_id}/calendars/{calendar_id}/blocked-days/{blocked_day_id}
     * @remarks Documented query: id (extra keys allowed).
     */
    deleteBlockedDays(calendarId: string, blockedDayId: string, opts: { query?: { id?: string } & Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/calendars/{calendar_id}/blocked-days/{blocked_day_id}', { path: { calendar_id: calendarId, blocked_day_id: blockedDayId }, query: opts.query });
    }

    /**
     * blockedDays.
     * @method POST /v1/workspaces/{workspace_id}/calendars/{calendar_id}/blocked-days
     * @remarks Any query params may be sent (none documented).
     */
    blockedDays(calendarId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/calendars/{calendar_id}/blocked-days', { path: { calendar_id: calendarId }, body, query: opts.query });
    }

    /**
     * updateRefresh.
     * @method PUT /v1/workspaces/{workspace_id}/calendars/{calendar_id}/jwt/refresh
     * @remarks Any query params may be sent (none documented).
     */
    updateRefresh(calendarId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/calendars/{calendar_id}/jwt/refresh', { path: { calendar_id: calendarId }, body, query: opts.query });
    }

    /**
     * deleteCalendar.
     * @method DELETE /v1/workspaces/{workspace_id}/calendars/{calendar_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteCalendar(calendarId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/calendars/{calendar_id}', { path: { calendar_id: calendarId }, query: opts.query });
    }

    /**
     * getCalendar.
     * @method GET /v1/workspaces/{workspace_id}/calendars/{calendar_id}
     * @remarks Any query params may be sent (none documented).
     */
    getCalendar(calendarId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/calendars/{calendar_id}', { path: { calendar_id: calendarId }, query: opts.query });
    }

    /**
     * updateCalendar.
     * @method PUT /v1/workspaces/{workspace_id}/calendars/{calendar_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateCalendar(calendarId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/calendars/{calendar_id}', { path: { calendar_id: calendarId }, body, query: opts.query });
    }

    /**
     * addCalendar.
     * @method PATCH /v1/workspaces/{workspace_id}/calendars/groups/{group_id}/add-calendar
     * @remarks Any query params may be sent (none documented).
     */
    addCalendar(groupId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/calendars/groups/{group_id}/add-calendar', { path: { group_id: groupId }, body, query: opts.query });
    }

    /**
     * getBlockedDays.
     * @method GET /v1/workspaces/{workspace_id}/calendars/groups/{group_id}/blocked-days
     * @remarks Documented query: filters (extra keys allowed).
     */
    getBlockedDays(groupId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/calendars/groups/{group_id}/blocked-days', { path: { group_id: groupId }, query: opts.query });
    }

    /**
     * updateJwtRefresh.
     * @method PUT /v1/workspaces/{workspace_id}/calendars/groups/{group_id}/jwt/refresh
     * @remarks Any query params may be sent (none documented).
     */
    updateJwtRefresh(groupId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/calendars/groups/{group_id}/jwt/refresh', { path: { group_id: groupId }, body, query: opts.query });
    }

    /**
     * removeCalendar.
     * @method PATCH /v1/workspaces/{workspace_id}/calendars/groups/{group_id}/remove-calendar
     * @remarks Any query params may be sent (none documented).
     */
    removeCalendar(groupId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/calendars/groups/{group_id}/remove-calendar', { path: { group_id: groupId }, body, query: opts.query });
    }

    /**
     * getUsersTasks.
     * @method GET /v1/workspaces/{workspace_id}/calendars/groups/{group_id}/users-tasks
     * @remarks Documented query: filters (extra keys allowed).
     */
    getUsersTasks(groupId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/calendars/groups/{group_id}/users-tasks', { path: { group_id: groupId }, query: opts.query });
    }

    /**
     * deleteGroups.
     * @method DELETE /v1/workspaces/{workspace_id}/calendars/groups/{group_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteGroups(groupId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/calendars/groups/{group_id}', { path: { group_id: groupId }, query: opts.query });
    }

    /**
     * getGroup.
     * @method GET /v1/workspaces/{workspace_id}/calendars/groups/{group_id}
     * @remarks Any query params may be sent (none documented).
     */
    getGroup(groupId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/calendars/groups/{group_id}', { path: { group_id: groupId }, query: opts.query });
    }

    /**
     * putGroups.
     * @method PUT /v1/workspaces/{workspace_id}/calendars/groups/{group_id}
     * @remarks Any query params may be sent (none documented).
     */
    putGroups(groupId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/calendars/groups/{group_id}', { path: { group_id: groupId }, body, query: opts.query });
    }

    /**
     * duplicated.
     * @method GET /v1/workspaces/{workspace_id}/calendars/groups/slug/duplicated/{duplicated_id}
     * @remarks Any query params may be sent (none documented).
     */
    duplicated(duplicatedId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/calendars/groups/slug/duplicated/{duplicated_id}', { path: { duplicated_id: duplicatedId }, query: opts.query });
    }

    /**
     * listGroups.
     * @method GET /v1/workspaces/{workspace_id}/calendars/groups
     * @remarks Documented query: filters (extra keys allowed).
     */
    listGroups(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/calendars/groups', { query: opts.query });
    }

    /**
     * groups.
     * @method POST /v1/workspaces/{workspace_id}/calendars/groups
     * @remarks Any query params may be sent (none documented).
     */
    groups(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/calendars/groups', { body, query: opts.query });
    }

    /**
     * listAvailability.
     * @method GET /v1/workspaces/{workspace_id}/calendars/me/availability
     * @remarks Any query params may be sent (none documented).
     */
    listAvailability(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/calendars/me/availability', { query: opts.query });
    }

    /**
     * getMe.
     * @method GET /v1/workspaces/{workspace_id}/calendars/me
     * @remarks Any query params may be sent (none documented).
     */
    getMe(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/calendars/me', { query: opts.query });
    }

    /**
     * getUser.
     * @method GET /v1/workspaces/{workspace_id}/calendars/user/{user_id}
     * @remarks Any query params may be sent (none documented).
     */
    getUser(userId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/calendars/user/{user_id}', { path: { user_id: userId }, query: opts.query });
    }

    /**
     * listCalendars.
     * @method GET /v1/workspaces/{workspace_id}/calendars
     * @remarks Documented query: filters (extra keys allowed).
     */
    listCalendars(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/calendars', { query: opts.query });
    }

    /**
     * createCalendar.
     * @method POST /v1/workspaces/{workspace_id}/calendars
     * @remarks Any query params may be sent (none documented).
     */
    createCalendar(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/calendars', { body, query: opts.query });
    }
}
