import { Resource } from './base';

/** `products-prices` resource (generated from openapi.json). */
export class ProductsPrices extends Resource {
    /**
     * deleteItem.
     * @method DELETE /v1/workspaces/{workspace_id}/products-prices/{products_price_id}/item/{item_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteItem(productsPriceId: string, itemId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/products-prices/{products_price_id}/item/{item_id}', { path: { products_price_id: productsPriceId, item_id: itemId }, query: opts.query });
    }

    /**
     * getProductPricesItemById.
     * @method GET /v1/workspaces/{workspace_id}/products-prices/{products_price_id}/item/{item_id}
     * @remarks Any query params may be sent (none documented).
     */
    getProductPricesItemById(productsPriceId: string, itemId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/products-prices/{products_price_id}/item/{item_id}', { path: { products_price_id: productsPriceId, item_id: itemId }, query: opts.query });
    }

    /**
     * putItem.
     * @method PUT /v1/workspaces/{workspace_id}/products-prices/{products_price_id}/item/{item_id}
     * @remarks Any query params may be sent (none documented).
     */
    putItem(productsPriceId: string, itemId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/products-prices/{products_price_id}/item/{item_id}', { path: { products_price_id: productsPriceId, item_id: itemId }, body, query: opts.query });
    }

    /**
     * getAllProductPricesItems.
     * @method GET /v1/workspaces/{workspace_id}/products-prices/{products_price_id}/item
     * @remarks Documented query: filters (extra keys allowed).
     */
    getAllProductPricesItems(productsPriceId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/products-prices/{products_price_id}/item', { path: { products_price_id: productsPriceId }, query: opts.query });
    }

    /**
     * item.
     * @method POST /v1/workspaces/{workspace_id}/products-prices/{products_price_id}/item
     * @remarks Any query params may be sent (none documented).
     */
    item(productsPriceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/products-prices/{products_price_id}/item', { path: { products_price_id: productsPriceId }, body, query: opts.query });
    }

    /**
     * deleteProductsPrice.
     * @method DELETE /v1/workspaces/{workspace_id}/products-prices/{products_price_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteProductsPrice(productsPriceId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/products-prices/{products_price_id}', { path: { products_price_id: productsPriceId }, query: opts.query });
    }

    /**
     * getProductsPrice.
     * @method GET /v1/workspaces/{workspace_id}/products-prices/{products_price_id}
     * @remarks Any query params may be sent (none documented).
     */
    getProductsPrice(productsPriceId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/products-prices/{products_price_id}', { path: { products_price_id: productsPriceId }, query: opts.query });
    }

    /**
     * updateProductsPrice.
     * @method PUT /v1/workspaces/{workspace_id}/products-prices/{products_price_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateProductsPrice(productsPriceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/products-prices/{products_price_id}', { path: { products_price_id: productsPriceId }, body, query: opts.query });
    }

    /**
     * listProductsPrices.
     * @method GET /v1/workspaces/{workspace_id}/products-prices
     * @remarks Documented query: filters (extra keys allowed).
     */
    listProductsPrices(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/products-prices', { query: opts.query });
    }

    /**
     * createProductsPrice.
     * @method POST /v1/workspaces/{workspace_id}/products-prices
     * @remarks Any query params may be sent (none documented).
     */
    createProductsPrice(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/products-prices', { body, query: opts.query });
    }
}
