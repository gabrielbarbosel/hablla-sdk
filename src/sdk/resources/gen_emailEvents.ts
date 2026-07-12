import { Resource } from './base';

/** `email-events` resource (generated from openapi.json). */
export class EmailEvents extends Resource {
    /**
     * createEmailEvent.
     * @method POST /v1/workspaces/{workspace_id}/email-events/{email_event_id}
     * @remarks Any query params may be sent (none documented).
     */
    createEmailEvent(emailEventId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/email-events/{email_event_id}', { path: { email_event_id: emailEventId }, body, query: opts.query });
    }
}
