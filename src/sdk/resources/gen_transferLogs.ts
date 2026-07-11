import { Resource } from './base';
import type { Paged } from '../core/types';

/** A transfer log entry. */
export interface TransferLog {
    id: string;
    type?: string;
    workspace?: string;
    service?: string;
    user?: string;
    old_user?: string;
    new_user?: string;
    old_sector?: string;
    new_sector?: string;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    service_id?: string;
    user_id?: string;
    [key: string]: unknown;
}

/** `transfer-logs` resource (generated from openapi.json). */
export class TransferLogs extends Resource {
    /**
     * Get on card by id.
     * @method GET /v1/workspaces/{workspace_id}/transfer-logs/cards/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getCard(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<TransferLog> {
        return this.http.get('/v1/workspaces/{workspace_id}/transfer-logs/cards/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Get on service by id.
     * @method GET /v1/workspaces/{workspace_id}/transfer-logs/services/{id}
     * @remarks Any query params may be sent (none documented).
     */
    getService(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<TransferLog> {
        return this.http.get('/v1/workspaces/{workspace_id}/transfer-logs/services/{id}', { path: { id }, query: opts.query });
    }

    /**
     * Get all cards from transfer-logs.
     * @method GET /v1/workspaces/{workspace_id}/transfer-logs/cards
     * @remarks Documented query: page, limit, order, direction_order, flow, reason, user, card, service, description, type, populate (extra keys allowed).
     */
    getCards(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; flow?: string; reason?: string; user?: string; card?: string; service?: string; description?: string; type?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<TransferLog>> {
        return this.http.get('/v1/workspaces/{workspace_id}/transfer-logs/cards', { query: opts.query });
    }

    /**
     * Get all transfer-logs.
     * @method GET /v1/workspaces/{workspace_id}/transfer-logs/services
     * @remarks Documented query: page, limit, order, direction_order, flow, reason, user, card, service, description, type, populate (extra keys allowed).
     */
    getServices(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; flow?: string; reason?: string; user?: string; card?: string; service?: string; description?: string; type?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<TransferLog>> {
        return this.http.get('/v1/workspaces/{workspace_id}/transfer-logs/services', { query: opts.query });
    }
}
