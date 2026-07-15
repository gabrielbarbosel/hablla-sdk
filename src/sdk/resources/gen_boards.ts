import { Resource } from './base';
import type { Paged } from '../core/types';
import type { CardStatusCode, TaskTypeCode } from './gen_enums';

/** A board. */
export interface Board {
    id: string;
    workspace?: string;
    sector?: string;
    name?: string;
    std_name?: string;
    custom_fields?: unknown;
    custom_fields_to_show?: unknown;
    lists?: unknown;
    dictionaries?: unknown;
    card_properties?: unknown;
    has_lost_reason?: boolean;
    has_won_reason?: boolean;
    can_edit_status_date?: boolean;
    quotation_custom_urls?: unknown;
    created_at?: string;
    updated_at?: string;
    workspace_id?: string;
    sector_id?: string;
    [key: string]: unknown;
}

/** `boards` resource (generated from openapi.json). */
export class Boards extends Resource {
    /**
     * Delete list.
     * @method DELETE /v1/workspaces/{workspace_id}/boards/{board_id}/lists/{list_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteLists(boardId: string, listId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/boards/{board_id}/lists/{list_id}', { path: { board_id: boardId, list_id: listId }, query: opts.query });
    }

    /**
     * Get list by id.
     * @method GET /v1/workspaces/{workspace_id}/boards/{board_id}/lists/{list_id}
     * @remarks Any query params may be sent (none documented).
     */
    getList(boardId: string, listId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Board> {
        return this.http.get('/v1/workspaces/{workspace_id}/boards/{board_id}/lists/{list_id}', { path: { board_id: boardId, list_id: listId }, query: opts.query });
    }

    /**
     * Update list by id.
     * @method PUT /v1/workspaces/{workspace_id}/boards/{board_id}/lists/{list_id}
     * @remarks Any query params may be sent (none documented).
     */
    putLists(boardId: string, listId: string, body: Partial<Board>, opts: { query?: Record<string, unknown> } = {}): Promise<Board> {
        return this.http.put('/v1/workspaces/{workspace_id}/boards/{board_id}/lists/{list_id}', { path: { board_id: boardId, list_id: listId }, body, query: opts.query });
    }

    /**
     * Get cards from a board by id.
     * @method GET /v1/workspaces/{workspace_id}/boards/{id}/cards
     * @remarks Documented query: limit, order, direction_order, name, search, campaign, source, person, organization, user, sector, status, product, reason, rating, tags, populate, board_populate, start_date, end_date, field_date, created_at, updated_at, has_next_task, next_task_start_date, prediction_date, entry_date, finished_at, next_task_type, custom_fields, list, highlight_old_cards, custom_id (extra keys allowed).
     */
    getCardsV1(id: string, opts: { query?: { limit?: number; order?: string; direction_order?: string; name?: string; search?: string; campaign?: string; source?: string; person?: string; organization?: string; user?: string; sector?: string; status?: CardStatusCode; product?: string; reason?: string; rating?: number; tags?: string[]; populate?: string[]; board_populate?: string[]; start_date?: string; end_date?: string; field_date?: string; created_at?: string; updated_at?: unknown; has_next_task?: boolean; next_task_start_date?: unknown; prediction_date?: unknown; entry_date?: unknown; finished_at?: unknown; next_task_type?: TaskTypeCode; custom_fields?: string; list?: string; highlight_old_cards?: boolean; custom_id?: string } & Record<string, unknown> } = {}): Promise<Paged<Board>> {
        return this.http.get('/v1/workspaces/{workspace_id}/boards/{id}/cards', { path: { id }, query: opts.query });
    }

    /**
     * Get all lists.
     * @method GET /v1/workspaces/{workspace_id}/boards/{board_id}/lists
     * @remarks Documented query: filters, page, limit, order, direction_order, name, populate (extra keys allowed).
     */
    getLists(boardId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Board>> {
        return this.http.get('/v1/workspaces/{workspace_id}/boards/{board_id}/lists', { path: { board_id: boardId }, query: opts.query });
    }

    /**
     * Create a list.
     * @method POST /v1/workspaces/{workspace_id}/boards/{board_id}/lists
     * @remarks Any query params may be sent (none documented).
     */
    lists(boardId: string, body: Partial<Board>, opts: { query?: Record<string, unknown> } = {}): Promise<Board> {
        return this.http.post('/v1/workspaces/{workspace_id}/boards/{board_id}/lists', { path: { board_id: boardId }, body, query: opts.query });
    }

    /**
     * Reorder lists inside a board by id.
     * @method PUT /v1/workspaces/{workspace_id}/boards/{board_id}/reorder-lists
     * @remarks Any query params may be sent (none documented).
     */
    reorderLists(boardId: string, body: Partial<Board>, opts: { query?: Record<string, unknown> } = {}): Promise<Board> {
        return this.http.put('/v1/workspaces/{workspace_id}/boards/{board_id}/reorder-lists', { path: { board_id: boardId }, body, query: opts.query });
    }

    /**
     * Get reports from a board by id.
     * @method GET /v1/workspaces/{workspace_id}/boards/{id}/reports
     * @remarks Any query params may be sent (none documented).
     */
    getReports(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Board>> {
        return this.http.get('/v1/workspaces/{workspace_id}/boards/{id}/reports', { path: { id }, query: opts.query });
    }

    /**
     * Delete board by id.
     * @method DELETE /v1/workspaces/{workspace_id}/boards/{board_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteBoard(boardId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/boards/{board_id}', { path: { board_id: boardId }, query: opts.query });
    }

    /**
     * Get board by id.
     * @method GET /v1/workspaces/{workspace_id}/boards/{board_id}
     * @remarks Documented query: populate (extra keys allowed).
     */
    getBoard(boardId: string, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Board> {
        return this.http.get('/v1/workspaces/{workspace_id}/boards/{board_id}', { path: { board_id: boardId }, query: opts.query });
    }

    /**
     * Update a board by id.
     * @method PUT /v1/workspaces/{workspace_id}/boards/{board_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateBoard(boardId: string, body: Partial<Board>, opts: { query?: Record<string, unknown> } = {}): Promise<Board> {
        return this.http.put('/v1/workspaces/{workspace_id}/boards/{board_id}', { path: { board_id: boardId }, body, query: opts.query });
    }

    /**
     * Get all boards.
     * @method GET /v1/workspaces/{workspace_id}/boards
     * @remarks Documented query: filters, page, limit, order, direction_order, name, populate (extra keys allowed).
     */
    listBoards(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Board>> {
        return this.http.get('/v1/workspaces/{workspace_id}/boards', { query: opts.query });
    }

    /**
     * Create a new board.
     * @method POST /v1/workspaces/{workspace_id}/boards
     * @remarks Any query params may be sent (none documented).
     */
    createBoard(body: Partial<Board>, opts: { query?: Record<string, unknown> } = {}): Promise<Board> {
        return this.http.post('/v1/workspaces/{workspace_id}/boards', { body, query: opts.query });
    }

    /**
     * Get cards from a board by id (V2).
     * @method GET /v2/workspaces/{workspace_id}/boards/{board_id}/cards
     * @remarks Documented query: filters, limit, order, direction_order, name, search, campaign, source, person, organization, user, sector, status, product, reason, rating, tags, populate, board_populate, start_date, end_date, field_date, created_at, updated_at, has_next_task, next_task_start_date, prediction_date, entry_date, finished_at, next_task_type, custom_fields, list, highlight_old_cards, custom_id (extra keys allowed).
     */
    getCards(boardId: string, opts: { query?: { filters?: string; limit?: number; order?: string; direction_order?: string; name?: string; search?: string; campaign?: string; source?: string; person?: string; organization?: string; user?: string; sector?: string; status?: CardStatusCode; product?: string; reason?: string; rating?: number; tags?: string[]; populate?: string[]; board_populate?: string[]; start_date?: string; end_date?: string; field_date?: string; created_at?: string; updated_at?: unknown; has_next_task?: boolean; next_task_start_date?: unknown; prediction_date?: unknown; entry_date?: unknown; finished_at?: unknown; next_task_type?: TaskTypeCode; custom_fields?: string; list?: string; highlight_old_cards?: boolean; custom_id?: string } & Record<string, unknown> } = {}): Promise<Paged<Board>> {
        return this.http.get('/v2/workspaces/{workspace_id}/boards/{board_id}/cards', { path: { board_id: boardId }, query: opts.query, queryFormat: 'json' });
    }
}
