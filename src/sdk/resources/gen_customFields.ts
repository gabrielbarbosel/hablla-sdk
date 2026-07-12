import { Resource } from './base';
import type { Paged } from '../core/types';

/** A custom field definition. */
export interface CustomField {
    id: string;
    name?: string;
    std_name?: string;
    workspace?: string;
    target?: string;
    type?: string;
    opts?: unknown;
    is_required?: boolean;
    is_sensitive?: boolean;
    is_visible?: boolean;
    read_only?: boolean;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    [key: string]: unknown;
}

/** `custom-fields` resource (generated from openapi.json). */
export class CustomFields extends Resource {
    /**
     * Delete custom field by id.
     * @method DELETE /v1/workspaces/{workspace_id}/custom-fields/{custom_field_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteCustomField(customFieldId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/custom-fields/{custom_field_id}', { path: { custom_field_id: customFieldId }, query: opts.query });
    }

    /**
     * Get custom field by id.
     * @method GET /v1/workspaces/{workspace_id}/custom-fields/{custom_field_id}
     * @remarks Any query params may be sent (none documented).
     */
    getCustomField(customFieldId: string, opts: { query?: Record<string, unknown> } = {}): Promise<CustomField> {
        return this.http.get('/v1/workspaces/{workspace_id}/custom-fields/{custom_field_id}', { path: { custom_field_id: customFieldId }, query: opts.query });
    }

    /**
     * Update custom field by id.
     * @method PUT /v1/workspaces/{workspace_id}/custom-fields/{custom_field_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateCustomField(customFieldId: string, body: Partial<CustomField>, opts: { query?: Record<string, unknown> } = {}): Promise<CustomField> {
        return this.http.put('/v1/workspaces/{workspace_id}/custom-fields/{custom_field_id}', { path: { custom_field_id: customFieldId }, body, query: opts.query });
    }

    /**
     * Get all custom fields.
     * @method GET /v1/workspaces/{workspace_id}/custom-fields
     * @remarks Documented query: filters, page, limit, order, direction_order, name, type, target, board, is_required, is_sensitive, is_visible, start_date, end_date, field_date (extra keys allowed).
     */
    listCustomFields(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; type?: string; target?: string; board?: string; is_required?: boolean; is_sensitive?: boolean; is_visible?: boolean; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<Paged<CustomField>> {
        return this.http.get('/v1/workspaces/{workspace_id}/custom-fields', { query: opts.query });
    }

    /**
     * Create custom field.
     * @method POST /v1/workspaces/{workspace_id}/custom-fields
     * @remarks Any query params may be sent (none documented).
     */
    createCustomField(body: Partial<CustomField>, opts: { query?: Record<string, unknown> } = {}): Promise<CustomField> {
        return this.http.post('/v1/workspaces/{workspace_id}/custom-fields', { body, query: opts.query });
    }
}
