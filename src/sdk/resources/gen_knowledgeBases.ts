import { Resource } from './base';

/** `knowledge-bases` resource (generated from openapi.json). */
export class KnowledgeBases extends Resource {
    /**
     * deleteSources.
     * @method DELETE /v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}/sources/{source_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteSources(knowledgeBaseId: string, sourceId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}/sources/{source_id}', { path: { knowledge_base_id: knowledgeBaseId, source_id: sourceId }, query: opts.query });
    }

    /**
     * getSource.
     * @method GET /v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}/sources/{source_id}
     * @remarks Any query params may be sent (none documented).
     */
    getSource(knowledgeBaseId: string, sourceId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}/sources/{source_id}', { path: { knowledge_base_id: knowledgeBaseId, source_id: sourceId }, query: opts.query });
    }

    /**
     * putSources.
     * @method PUT /v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}/sources/{source_id}
     * @remarks Any query params may be sent (none documented).
     */
    putSources(knowledgeBaseId: string, sourceId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}/sources/{source_id}', { path: { knowledge_base_id: knowledgeBaseId, source_id: sourceId }, body, query: opts.query });
    }

    /**
     * getSources.
     * @method GET /v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}/sources
     * @remarks Documented query: filters (extra keys allowed).
     */
    getSources(knowledgeBaseId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}/sources', { path: { knowledge_base_id: knowledgeBaseId }, query: opts.query });
    }

    /**
     * sources.
     * @method POST /v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}/sources
     * @remarks Any query params may be sent (none documented).
     */
    sources(knowledgeBaseId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}/sources', { path: { knowledge_base_id: knowledgeBaseId }, body, query: opts.query });
    }

    /**
     * deleteKnowledgeBase.
     * @method DELETE /v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}
     * @remarks Any query params may be sent (none documented).
     */
    deleteKnowledgeBase(knowledgeBaseId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}', { path: { knowledge_base_id: knowledgeBaseId }, query: opts.query });
    }

    /**
     * getKnowledgeBase.
     * @method GET /v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}
     * @remarks Any query params may be sent (none documented).
     */
    getKnowledgeBase(knowledgeBaseId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}', { path: { knowledge_base_id: knowledgeBaseId }, query: opts.query });
    }

    /**
     * updateKnowledgeBase.
     * @method PUT /v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}
     * @remarks Any query params may be sent (none documented).
     */
    updateKnowledgeBase(knowledgeBaseId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/knowledge-bases/{knowledge_base_id}', { path: { knowledge_base_id: knowledgeBaseId }, body, query: opts.query });
    }

    /**
     * listKnowledgeBases.
     * @method GET /v1/workspaces/{workspace_id}/knowledge-bases
     * @remarks Documented query: filters (extra keys allowed).
     */
    listKnowledgeBases(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/knowledge-bases', { query: opts.query });
    }

    /**
     * createKnowledgeBase.
     * @method POST /v1/workspaces/{workspace_id}/knowledge-bases
     * @remarks Any query params may be sent (none documented).
     */
    createKnowledgeBase(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/knowledge-bases', { body, query: opts.query });
    }
}
