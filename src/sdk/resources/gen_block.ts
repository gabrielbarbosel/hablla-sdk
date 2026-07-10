import { Resource } from './base';

/** `block` resource (generated from openapi.json). */
export class Block extends Resource {
    /**
     * updateBlock.
     * @method PATCH /v1/workspaces/{workspace_id}/block
     * @remarks Documented query: is_blocked (extra keys allowed).
     */
    updateBlock(body: Record<string, unknown>, opts: { query?: { is_blocked?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.patch('/v1/workspaces/{workspace_id}/block', { body, query: opts.query });
    }
}
