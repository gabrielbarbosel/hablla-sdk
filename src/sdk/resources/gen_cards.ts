import { Resource } from './base';
import type { Paged } from '../core/types';

/** A card (deal / opportunity). */
export interface Card {
    id: string;
    name?: unknown;
    user?: unknown;
    [key: string]: unknown;
}

/** `cards` resource (generated from openapi.json). */
export class Cards extends Resource {
    /**
     * Remove checklist item from a card by id.
     * @method DELETE /v1/workspaces/{workspace_id}/cards/{card_id}/checklist/{checklist_id}
     * @remarks Documented query: flow_execution, user (extra keys allowed).
     */
    deleteChecklist(cardId: string, checklistId: string, opts: { query?: { flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/cards/{card_id}/checklist/{checklist_id}', { path: { card_id: cardId, checklist_id: checklistId }, query: opts.query });
    }

    /**
     * Update checklist from a card by id.
     * @method PUT /v1/workspaces/{workspace_id}/cards/{card_id}/checklist/{checklist_id}
     * @remarks Documented query: flow_execution, user (extra keys allowed).
     */
    putChecklist(cardId: string, checklistId: string, body: Partial<Card>, opts: { query?: { flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.put('/v1/workspaces/{workspace_id}/cards/{card_id}/checklist/{checklist_id}', { path: { card_id: cardId, checklist_id: checklistId }, body, query: opts.query });
    }

    /**
     * Remove a product from a card card by id.
     * @method DELETE /v1/workspaces/{workspace_id}/cards/{id}/products/{product_id}
     * @remarks Documented query: code (extra keys allowed).
     */
    deleteProducts(productId: string, id: string, opts: { query?: { code?: number } & Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/cards/{id}/products/{product_id}', { path: { product_id: productId, id }, query: opts.query });
    }

    /**
     * Update product on a card by id.
     * @method PUT /v1/workspaces/{workspace_id}/cards/{id}/products/{product_id}
     * @remarks Documented query: code (extra keys allowed).
     */
    putProducts(productId: string, id: string, body: Partial<Card>, opts: { query?: { code?: number } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.put('/v1/workspaces/{workspace_id}/cards/{id}/products/{product_id}', { path: { product_id: productId, id }, body, query: opts.query });
    }

    /**
     * Batch update products on card by id.
     * @method POST /v1/workspaces/{workspace_id}/cards/{card_id}/products/batch
     * @remarks Any query params may be sent (none documented).
     */
    batchAddProductsCard(cardId: string, body: Partial<Card>, opts: { query?: Record<string, unknown> } = {}): Promise<Card> {
        return this.http.post('/v1/workspaces/{workspace_id}/cards/{card_id}/products/batch', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Add followers to a card by id.
     * @method PATCH /v1/workspaces/{workspace_id}/cards/{card_id}/add-followers
     * @remarks Documented query: followers, flow_execution, user (extra keys allowed).
     */
    addFollowers(cardId: string, body: Partial<Card>, opts: { query?: { followers?: string; flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.patch('/v1/workspaces/{workspace_id}/cards/{card_id}/add-followers', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Add persons on a card by id.
     * @method PATCH /v1/workspaces/{workspace_id}/cards/{card_id}/add-persons
     * @remarks Documented query: persons, flow_execution, user (extra keys allowed).
     */
    addPersons(cardId: string, body: Partial<Card>, opts: { query?: { persons?: string; flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.patch('/v1/workspaces/{workspace_id}/cards/{card_id}/add-persons', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Add tags to a card by id.
     * @method PUT /v1/workspaces/{workspace_id}/cards/{card_id}/add-tags
     * @remarks Documented query: tags, flow_execution, user (extra keys allowed).
     */
    addTags(cardId: string, body: Partial<Card>, opts: { query?: { tags?: string; flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.put('/v1/workspaces/{workspace_id}/cards/{card_id}/add-tags', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Add checklist to a card by id.
     * @method POST /v1/workspaces/{workspace_id}/cards/{card_id}/checklist
     * @remarks Documented query: flow_execution, user (extra keys allowed).
     */
    checklist(cardId: string, body: Partial<Card>, opts: { query?: { flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.post('/v1/workspaces/{workspace_id}/cards/{card_id}/checklist', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Get all costs allocations by card.
     * @method GET /v1/workspaces/{workspace_id}/cards/{card_id}/costs
     * @remarks Documented query: filters, page, limit, order, direction_order, entity_type, start_date, end_date, populate (extra keys allowed).
     */
    getCosts(cardId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; entity_type?: string; start_date?: string; end_date?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Card>> {
        return this.http.get('/v1/workspaces/{workspace_id}/cards/{card_id}/costs', { path: { card_id: cardId }, query: opts.query });
    }

    /**
     * Move card to a new list by id.
     * @method PATCH /v1/workspaces/{workspace_id}/cards/{card_id}/move
     * @remarks Documented query: list, flow_execution, user (extra keys allowed).
     */
    move(cardId: string, body: Partial<Card>, opts: { query?: { list?: string; flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.patch('/v1/workspaces/{workspace_id}/cards/{card_id}/move', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Add payment intervals to a card by id.
     * @method PUT /v1/workspaces/{workspace_id}/cards/{card_id}/payment-interval
     * @remarks Documented query: flow_execution, user (extra keys allowed).
     */
    putPaymentInterval(cardId: string, body: Partial<Card>, opts: { query?: { flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.put('/v1/workspaces/{workspace_id}/cards/{card_id}/payment-interval', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Add product to a card card by id.
     * @method POST /v1/workspaces/{workspace_id}/cards/{id}/products
     * @remarks Any query params may be sent (none documented).
     */
    products(id: string, body: Partial<Card>, opts: { query?: Record<string, unknown> } = {}): Promise<Card> {
        return this.http.post('/v1/workspaces/{workspace_id}/cards/{id}/products', { path: { id }, body, query: opts.query });
    }

    /**
     * Add products prices to a card by id.
     * @method PUT /v1/workspaces/{workspace_id}/cards/{card_id}/products-prices
     * @remarks Documented query: flow_execution, user (extra keys allowed).
     */
    putProductsPrices(cardId: string, body: Partial<Card>, opts: { query?: { flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.put('/v1/workspaces/{workspace_id}/cards/{card_id}/products-prices', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Purge card by id.
     * @method GET /v1/workspaces/{workspace_id}/cards/{card_id}/purge
     * @remarks Any query params may be sent (none documented).
     */
    getPurge(cardId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Card>> {
        return this.http.get('/v1/workspaces/{workspace_id}/cards/{card_id}/purge', { path: { card_id: cardId }, query: opts.query });
    }

    /**
     * Remove followers from a card by id.
     * @method PATCH /v1/workspaces/{workspace_id}/cards/{card_id}/remove-followers
     * @remarks Documented query: followers (extra keys allowed).
     */
    removeFollowers(cardId: string, body: Partial<Card>, opts: { query?: { followers?: string } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.patch('/v1/workspaces/{workspace_id}/cards/{card_id}/remove-followers', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Remove payment intervals from a card by id.
     * @method PUT /v1/workspaces/{workspace_id}/cards/{card_id}/remove-payment-interval
     * @remarks Documented query: flow_execution, user (extra keys allowed).
     */
    removePaymentInterval(cardId: string, body: Partial<Card>, opts: { query?: { flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.put('/v1/workspaces/{workspace_id}/cards/{card_id}/remove-payment-interval', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Remove persons from a card by id.
     * @method PATCH /v1/workspaces/{workspace_id}/cards/{card_id}/remove-persons
     * @remarks Documented query: persons, flow_execution, user (extra keys allowed).
     */
    removePersons(cardId: string, body: Partial<Card>, opts: { query?: { persons?: string; flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.patch('/v1/workspaces/{workspace_id}/cards/{card_id}/remove-persons', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Remove products prices from a card by id.
     * @method PUT /v1/workspaces/{workspace_id}/cards/{card_id}/remove-products-prices
     * @remarks Documented query: flow_execution, user (extra keys allowed).
     */
    removeProductsPrices(cardId: string, body: Partial<Card>, opts: { query?: { flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.put('/v1/workspaces/{workspace_id}/cards/{card_id}/remove-products-prices', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Remove tags from a card by id.
     * @method PUT /v1/workspaces/{workspace_id}/cards/{card_id}/remove-tags
     * @remarks Documented query: tags (extra keys allowed).
     */
    removeTags(cardId: string, body: Partial<Card>, opts: { query?: { tags?: string } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.put('/v1/workspaces/{workspace_id}/cards/{card_id}/remove-tags', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Delete card by id.
     * @method DELETE /v1/workspaces/{workspace_id}/cards/{card_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteCard(cardId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/cards/{card_id}', { path: { card_id: cardId }, query: opts.query });
    }

    /**
     * Get card by id.
     * @method GET /v1/workspaces/{workspace_id}/cards/{card_id}
     * @remarks Documented query: params, flow_execution, user (extra keys allowed).
     */
    getCard(cardId: string, opts: { query?: { params?: string; flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.get('/v1/workspaces/{workspace_id}/cards/{card_id}', { path: { card_id: cardId }, query: opts.query });
    }

    /**
     * Update card by id.
     * @method PUT /v1/workspaces/{workspace_id}/cards/{card_id}
     * @remarks Documented query: flow_execution, user (extra keys allowed).
     */
    updateCard(cardId: string, body: Partial<Card>, opts: { query?: { flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.put('/v1/workspaces/{workspace_id}/cards/{card_id}', { path: { card_id: cardId }, body, query: opts.query });
    }

    /**
     * Create a new batch action.
     * @method POST /v1/workspaces/{workspace_id}/cards/batch
     * @remarks Any query params may be sent (none documented).
     */
    batchCards(body: Partial<Card>, opts: { query?: Record<string, unknown> } = {}): Promise<Card> {
        return this.http.post('/v1/workspaces/{workspace_id}/cards/batch', { body, query: opts.query });
    }

    /**
     * Create or update a card.
     * @method POST /v1/workspaces/{workspace_id}/cards/create-or-update
     * @remarks Documented query: page, limit, order, direction_order, name, search, campaign, source, id, list, custom_id, board, person, organization, user, product, service, status, rating, tags, start_date, end_date, field_date, created_at, updated_at, prediction_date, next_task_start_date, next_task_type, has_next_task, custom_fields, update_rule (extra keys allowed).
     */
    createOrUpdate(body: Partial<Card>, opts: { query?: { page?: number; limit?: number; order?: string; direction_order?: string; name?: string; search?: string; campaign?: string; source?: string; id?: string; list?: string; custom_id?: string; board?: string; person?: string; organization?: string; user?: string; product?: string; service?: string; status?: string; rating?: string; tags?: string[]; start_date?: string; end_date?: string; field_date?: string; created_at?: string; updated_at?: unknown; prediction_date?: unknown; next_task_start_date?: unknown; next_task_type?: string; has_next_task?: string; custom_fields?: string[]; update_rule?: string } & Record<string, unknown> } = {}): Promise<Card> {
        return this.http.post('/v1/workspaces/{workspace_id}/cards/create-or-update', { body, query: opts.query });
    }

    /**
     * Get all cards.
     * @method GET /v1/workspaces/{workspace_id}/cards
     * @remarks Documented query: page, limit, order, direction_order, name, search, campaign, source, list, custom_id, board, person, organization, user, product, service, sector, status, rating, tags, followers, users, populate, start_date, end_date, field_date, created_at, updated_at, finished_at, prediction_date, entry_date, next_task_start_date, next_task_type, has_next_task, custom_fields, highlight_old_cards (extra keys allowed).
     */
    listCardsV1(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; name?: string; search?: string; campaign?: string; source?: string; list?: string; custom_id?: string; board?: string; person?: string; organization?: string; user?: string; product?: string; service?: string; sector?: string; status?: string; rating?: string; tags?: string[]; followers?: string[]; users?: string[]; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; created_at?: string; updated_at?: unknown; finished_at?: unknown; prediction_date?: unknown; entry_date?: unknown; next_task_start_date?: unknown; next_task_type?: string; has_next_task?: string; custom_fields?: string[]; highlight_old_cards?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Card>> {
        return this.http.get('/v1/workspaces/{workspace_id}/cards', { query: opts.query });
    }

    /**
     * Create a new card.
     * @method POST /v1/workspaces/{workspace_id}/cards
     * @remarks Any query params may be sent (none documented).
     */
    createCard(body: Partial<Card>, opts: { query?: Record<string, unknown> } = {}): Promise<Card> {
        return this.http.post('/v1/workspaces/{workspace_id}/cards', { body, query: opts.query });
    }

    /**
     * Create all cards (V2).
     * @method GET /v2/workspaces/{workspace_id}/cards
     * @remarks Documented query: page, limit, order, direction_order, name, search, campaign, source, list, custom_id, board, person, organization, user, product, service, sector, status, rating, tags, followers, users, populate, start_date, end_date, field_date, created_at, updated_at, finished_at, prediction_date, entry_date, next_task_start_date, next_task_type, has_next_task, custom_fields, highlight_old_cards (extra keys allowed).
     */
    listCardsV2(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; name?: string; search?: string; campaign?: string; source?: string; list?: string; custom_id?: string; board?: string; person?: string; organization?: string; user?: string; product?: string; service?: string; sector?: string; status?: string; rating?: string; tags?: string[]; followers?: string[]; users?: string[]; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; created_at?: string; updated_at?: unknown; finished_at?: unknown; prediction_date?: unknown; entry_date?: unknown; next_task_start_date?: unknown; next_task_type?: string; has_next_task?: string; custom_fields?: string[]; highlight_old_cards?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Card>> {
        return this.http.get('/v2/workspaces/{workspace_id}/cards', { query: opts.query });
    }

    /**
     * Get all cards (V3).
     * @method GET /v3/workspaces/{workspace_id}/cards
     * @remarks Documented query: filters, page, limit, order, direction_order, name, search, campaign, source, list, custom_id, board, person, organization, user, product, service, sector, status, rating, tags, followers, users, populate, start_date, end_date, field_date, created_at, updated_at, finished_at, prediction_date, entry_date, next_task_start_date, next_task_type, has_next_task, custom_fields, highlight_old_cards (extra keys allowed).
     */
    listCards(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; search?: string; campaign?: string; source?: string; list?: string; custom_id?: string; board?: string; person?: string; organization?: string; user?: string; product?: string; service?: string; sector?: string; status?: string; rating?: string; tags?: string[]; followers?: string[]; users?: string[]; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; created_at?: string; updated_at?: unknown; finished_at?: unknown; prediction_date?: unknown; entry_date?: unknown; next_task_start_date?: unknown; next_task_type?: string; has_next_task?: string; custom_fields?: string[]; highlight_old_cards?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Card>> {
        return this.http.get('/v3/workspaces/{workspace_id}/cards', { query: opts.query });
    }
}
