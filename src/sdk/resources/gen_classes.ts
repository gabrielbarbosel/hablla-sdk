import { Resource } from './base';
import type { Paged } from '../core/types';

/** A class (custom entity definition / code class). */
export interface Class {
    id: string;
    name?: string;
    label?: string;
    workspace?: string;
    user?: string;
    is_public?: boolean;
    is_enable?: boolean;
    js_code?: string;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    user_id?: string;
    [key: string]: unknown;
}

/** `classes` resource (generated from openapi.json). */
export class Classes extends Resource {
    /**
     * makePublic.
     * @method POST /v1/workspaces/{workspace_id}/classes/{class_id}/make-public
     * @remarks Any query params may be sent (none documented).
     */
    makePublic(classId: string, body: Partial<Class>, opts: { query?: Record<string, unknown> } = {}): Promise<Class> {
        return this.http.post('/v1/workspaces/{workspace_id}/classes/{class_id}/make-public', { path: { class_id: classId }, body, query: opts.query });
    }

    /**
     * updateClass.
     * @method PUT /v1/workspaces/{workspace_id}/classes/{class_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateClass(classId: string, body: Partial<Class>, opts: { query?: Record<string, unknown> } = {}): Promise<Class> {
        return this.http.put('/v1/workspaces/{workspace_id}/classes/{class_id}', { path: { class_id: classId }, body, query: opts.query });
    }

    /**
     * publish.
     * @method POST /v1/workspaces/{workspace_id}/classes/publish
     * @remarks Any query params may be sent (none documented).
     */
    publish(body: Partial<Class>, opts: { query?: Record<string, unknown> } = {}): Promise<Class> {
        return this.http.post('/v1/workspaces/{workspace_id}/classes/publish', { body, query: opts.query });
    }

    /**
     * listClasses.
     * @method GET /v1/workspaces/{workspace_id}/classes
     * @remarks Documented query: filters (extra keys allowed).
     */
    listClasses(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Class>> {
        return this.http.get('/v1/workspaces/{workspace_id}/classes', { query: opts.query });
    }

    /**
     * createClass.
     * @method POST /v1/workspaces/{workspace_id}/classes
     * @remarks Any query params may be sent (none documented).
     */
    createClass(body: Partial<Class>, opts: { query?: Record<string, unknown> } = {}): Promise<Class> {
        return this.http.post('/v1/workspaces/{workspace_id}/classes', { body, query: opts.query });
    }
}
