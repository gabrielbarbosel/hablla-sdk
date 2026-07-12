import { Resource } from './base';

/** `classes` resource (generated from openapi.json). */
export class Classes extends Resource {
    /**
     * makePublic.
     * @method POST /v1/workspaces/{workspace_id}/classes/{class_id}/make-public
     * @remarks Any query params may be sent (none documented).
     */
    makePublic(classId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/classes/{class_id}/make-public', { path: { class_id: classId }, body, query: opts.query });
    }

    /**
     * updateClass.
     * @method PUT /v1/workspaces/{workspace_id}/classes/{class_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateClass(classId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/classes/{class_id}', { path: { class_id: classId }, body, query: opts.query });
    }

    /**
     * publish.
     * @method POST /v1/workspaces/{workspace_id}/classes/publish
     * @remarks Any query params may be sent (none documented).
     */
    publish(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/classes/publish', { body, query: opts.query });
    }

    /**
     * listClasses.
     * @method GET /v1/workspaces/{workspace_id}/classes
     * @remarks Documented query: filters (extra keys allowed).
     */
    listClasses(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/classes', { query: opts.query });
    }

    /**
     * createClass.
     * @method POST /v1/workspaces/{workspace_id}/classes
     * @remarks Any query params may be sent (none documented).
     */
    createClass(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/classes', { body, query: opts.query });
    }
}
