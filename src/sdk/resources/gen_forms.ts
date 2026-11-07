import { Resource } from './base';

/** `forms` resource (generated from openapi.json). */
export class Forms extends Resource {
    /**
     * getForm.
     * @method GET /v1/forms/{form_id}
     * @remarks Any query params may be sent (none documented).
     */
    getForm(formId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/forms/{form_id}', { path: { form_id: formId }, query: opts.query });
    }
}
