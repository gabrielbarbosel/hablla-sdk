import { Resource } from './base';

/** `products` resource (generated from openapi.json). */
export class Products extends Resource {
    /**
     * Delete product by id.
     * @method DELETE /v1/workspaces/{workspace_id}/products/{product_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteProduct(productId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/products/{product_id}', { path: { product_id: productId }, query: opts.query });
    }

    /**
     * Get product by id.
     * @method GET /v1/workspaces/{workspace_id}/products/{product_id}
     * @remarks Any query params may be sent (none documented).
     */
    getProduct(productId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/products/{product_id}', { path: { product_id: productId }, query: opts.query });
    }

    /**
     * Update product by id.
     * @method PUT /v1/workspaces/{workspace_id}/products/{product_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateProduct(productId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/products/{product_id}', { path: { product_id: productId }, body, query: opts.query });
    }

    /**
     * Get all products.
     * @method GET /v1/workspaces/{workspace_id}/products
     * @remarks Documented query: filters, page, limit, order, direction_order, name, sku, exact_sku, product_group, product_groups, search, updated_at, populate, custom_fields, is_active, currency_code (extra keys allowed).
     */
    listProducts(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; sku?: string; exact_sku?: string; product_group?: string; product_groups?: string[]; search?: string; updated_at?: string; populate?: string[]; custom_fields?: string[]; is_active?: boolean; currency_code?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/products', { query: opts.query });
    }

    /**
     * Create a product.
     * @method POST /v1/workspaces/{workspace_id}/products
     * @remarks Any query params may be sent (none documented).
     */
    createProduct(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/products', { body, query: opts.query });
    }
}
