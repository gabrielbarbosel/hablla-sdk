import { Resource } from './base';

/** `legal-entities` resource (generated from openapi.json). */
export class LegalEntities extends Resource {
    /**
     * getUser.
     * @method GET /v1/legal-entities/user/{user_id}
     * @remarks Any query params may be sent (none documented).
     */
    getUser(userId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/legal-entities/user/{user_id}', { path: { user_id: userId }, query: opts.query });
    }

    /**
     * updateLegalEntity.
     * @method PUT /v1/legal-entities/{legal_entity_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateLegalEntity(legalEntityId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/legal-entities/{legal_entity_id}', { path: { legal_entity_id: legalEntityId }, body, query: opts.query });
    }

    /**
     * listLegalEntities.
     * @method GET /v1/legal-entities
     * @remarks Any query params may be sent (none documented).
     */
    listLegalEntities(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/legal-entities', { query: opts.query });
    }

    /**
     * createLegalEntity.
     * @method POST /v1/legal-entities
     * @remarks Any query params may be sent (none documented).
     */
    createLegalEntity(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/legal-entities', { body, query: opts.query });
    }
}
