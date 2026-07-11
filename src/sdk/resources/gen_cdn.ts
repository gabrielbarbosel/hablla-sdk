import { Resource } from './base';
import type { MultipartFile, MultipartBody } from '../core/types';

/** `cdn` resource (generated from openapi.json). */
export class Cdn extends Resource {
    /**
     * deleteCdn.
     * @method DELETE /v1/workspaces/{workspace_id}/cdn
     * @remarks Any query params may be sent (none documented).
     */
    deleteCdn(opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/cdn', { query: opts.query });
    }

    /**
     * createCdn.
     * @method POST /v1/workspaces/{workspace_id}/cdn
     * @remarks Any query params may be sent (none documented).
     * @param file The spreadsheet file part (sent under the `file` field).
     * @param fields Extra form-data text fields to send alongside the file.
     */
    createCdn(file: MultipartFile, fields?: Record<string, string>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        const body: MultipartBody = { kind: 'multipart', fields, files: { file } };
        return this.http.post('/v1/workspaces/{workspace_id}/cdn', { body, query: opts.query });
    }
}
