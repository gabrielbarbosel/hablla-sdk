import { Resource } from './base';

/** `cards-groups` resource (generated from openapi.json). */
export class CardsGroups extends Resource {
    /**
     * getItems.
     * @method GET /v1/workspaces/{workspace_id}/cards-groups/{cards_group_id}/items
     * @remarks Documented query: filters (extra keys allowed).
     */
    getItems(cardsGroupId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/cards-groups/{cards_group_id}/items', { path: { cards_group_id: cardsGroupId }, query: opts.query });
    }

    /**
     * listCardsGroups.
     * @method GET /v1/workspaces/{workspace_id}/cards-groups
     * @remarks Documented query: filters (extra keys allowed).
     */
    listCardsGroups(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/cards-groups', { query: opts.query });
    }
}
