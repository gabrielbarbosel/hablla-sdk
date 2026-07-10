import { Resource } from './base';

/** `pages-projects` resource (generated from openapi.json). */
export class PagesProjects extends Resource {
    /**
     * putPublic.
     * @method PUT /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/public
     * @remarks Any query params may be sent (none documented).
     */
    putPublic(pagesProjectId: string, pageId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}/pages/{page_id}/public', { path: { pages_project_id: pagesProjectId, page_id: pageId }, body, query: opts.query });
    }

    /**
     * updatePagesProject.
     * @method PATCH /v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}
     * @remarks Any query params may be sent (none documented).
     */
    updatePagesProject(pagesProjectId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/pages-projects/{pages_project_id}', { path: { pages_project_id: pagesProjectId }, body, query: opts.query });
    }
}
