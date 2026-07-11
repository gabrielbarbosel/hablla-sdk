import { Resource } from './base';
import type { MultipartFile, MultipartBody } from '../core/types';

/** `import` resource (generated from openapi.json). */
export class Import extends Resource {
    /**
     * createImport.
     * @method POST /v1/workspaces/{workspace_id}/import
     * @remarks Any query params may be sent (none documented).
     * @param file The spreadsheet file part (sent under the `file` field).
     * @param fields Extra form-data text fields to send alongside the file.
     */
    createImport(file: MultipartFile, fields?: Record<string, string>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        const body: MultipartBody = { kind: 'multipart', fields, files: { file } };
        return this.http.post('/v1/workspaces/{workspace_id}/import', { body, query: opts.query });
    }
}
