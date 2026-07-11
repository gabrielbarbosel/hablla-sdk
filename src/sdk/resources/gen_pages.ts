import { Resource } from './base';

/** `pages` resource (generated from openapi.json). */
export class Pages extends Resource {
    /**
     * Set page project editor.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{id}/editor-version
     * @remarks Any query params may be sent (none documented).
     */
    patchEditorVersion(id: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{id}/editor-version', { path: { id }, body, query: opts.query });
    }
}
