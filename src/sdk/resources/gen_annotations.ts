import { Resource } from './base';
import type { Paged } from '../core/types';

/** An annotation attached to a person, card, service or organization. */
export interface Annotation {
    id: string;
    description?: string;
    type?: string;
    is_fixed?: boolean;
    file?: unknown;
    data?: unknown;
    [key: string]: unknown;
}

/** `annotations` resource (generated from openapi.json). */
export class Annotations extends Resource {
    /**
     * Delete annotation by id.
     * @method DELETE /v1/workspaces/{workspace_id}/annotations/{id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteAnnotation(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/annotations/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Get annotation by id.
     * @method GET /v1/workspaces/{workspace_id}/annotations/{id}
     * @remarks Documented query: filters (extra keys allowed).
     */
    getAnnotation(id: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Annotation> {
        return this.http.get('/v1/workspaces/{workspace_id}/annotations/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Update annotation by id.
     * @method PUT /v1/workspaces/{workspace_id}/annotations/{id}
     * @remarks Any query params may be sent (none documented).
     */
    updateAnnotation(id: string, body: Partial<Annotation>, opts: { query?: Record<string, unknown> } = {}): Promise<Annotation> {
        return this.http.put('/v1/workspaces/{workspace_id}/annotations/{id}', { path: { id }, body, query: opts.query });
    }

    /**
     * Get all annotations.
     * @method GET /v1/workspaces/{workspace_id}/annotations
     * @remarks Documented query: filters, page, limit, order, direction_order, person, card, service, organization, description, type, populate, is_fixed (extra keys allowed).
     */
    listAnnotations(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; person?: string; card?: string; service?: string; organization?: string; description?: string; type?: string; populate?: string[]; is_fixed?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Annotation>> {
        return this.http.get('/v1/workspaces/{workspace_id}/annotations', { query: opts.query });
    }

    /**
     * Create a new annotation.
     * @method POST /v1/workspaces/{workspace_id}/annotations
     * @remarks Any query params may be sent (none documented).
     */
    createAnnotation(body: Partial<Annotation>, opts: { query?: Record<string, unknown> } = {}): Promise<Annotation> {
        return this.http.post('/v1/workspaces/{workspace_id}/annotations', { body, query: opts.query });
    }
}
