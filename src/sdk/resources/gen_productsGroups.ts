import { Resource } from './base';

/** `products-groups` resource (generated from openapi.json). */
export class ProductsGroups extends Resource {
    /**
     * getParent.
     * @method GET /v1/workspaces/{workspace_id}/products-groups/check/code/{code_id}/parent/{parent_id}
     * @remarks Documented query: product_group (extra keys allowed).
     */
    getParent(codeId: string, parentId: string, opts: { query?: { product_group?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/products-groups/check/code/{code_id}/parent/{parent_id}', { path: { code_id: codeId, parent_id: parentId }, query: opts.query });
    }

    /**
     * getCode.
     * @method GET /v1/workspaces/{workspace_id}/products-groups/check/code/{code_id}
     * @remarks Documented query: product_group (extra keys allowed).
     */
    getCode(codeId: string, opts: { query?: { product_group?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/products-groups/check/code/{code_id}', { path: { code_id: codeId }, query: opts.query });
    }

    /**
     * deleteProductsGroup.
     * @method DELETE /v1/workspaces/{workspace_id}/products-groups/{products_group_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteProductsGroup(productsGroupId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/products-groups/{products_group_id}', { path: { products_group_id: productsGroupId }, query: opts.query });
    }

    /**
     * getProductsGroup.
     * @method GET /v1/workspaces/{workspace_id}/products-groups/{products_group_id}
     * @remarks Any query params may be sent (none documented).
     */
    getProductsGroup(productsGroupId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/products-groups/{products_group_id}', { path: { products_group_id: productsGroupId }, query: opts.query });
    }

    /**
     * updateProductsGroup.
     * @method PUT /v1/workspaces/{workspace_id}/products-groups/{products_group_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateProductsGroup(productsGroupId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/products-groups/{products_group_id}', { path: { products_group_id: productsGroupId }, body, query: opts.query });
    }

    /**
     * listProductsGroups.
     * @method GET /v1/workspaces/{workspace_id}/products-groups
     * @remarks Documented query: filters (extra keys allowed).
     */
    listProductsGroups(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/products-groups', { query: opts.query });
    }

    /**
     * createProductsGroup.
     * @method POST /v1/workspaces/{workspace_id}/products-groups
     * @remarks Any query params may be sent (none documented).
     */
    createProductsGroup(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/products-groups', { body, query: opts.query });
    }
}
