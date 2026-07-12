You are the release scribe for the hablla TypeScript SDK, which is
generated from the Hablla studio bundle + swagger.

The codegen run classified this diff as: breaking.

Write a PULL REQUEST body for human review. Explain, in plain
language, exactly which endpoints were removed or whose signature
changed, the blast radius for SDK consumers, and a recommended
migration note. Be precise and do not invent endpoints.

Base your answer ONLY on this compact generation summary
(the 'spec' blob is omitted and endpoint lists are truncated to keep
the prompt small — GitHub Models caps input tokens):

```json
{
  "classification": "breaking",
  "guards": {
    "reasons": []
  },
  "diff": {
    "addedCount": 0,
    "removedCount": 0,
    "changedSignatureCount": 292,
    "addedEndpoints": [],
    "removedEndpoints": [],
    "changedSignatures": [
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/annotations",
        "before": "listAnnotations(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; person?: string; card?: string; service?: string; organization?: string; description?: string; type?: string; populate?: string[]; is_fixed?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Annotation>>",
        "after": "listAnnotations(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; person?: string; card?: string; service?: string; organization?: string; description?: string; type?: string; populate?: string[]; is_fixed?: boolean } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/annotations/{annotation_id}",
        "before": "getAnnotation(annotationId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Annotation>",
        "after": "getAnnotation(annotationId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/automation-rules/boards/{board_id}",
        "before": "getBoard(boardId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<AutomationRule>",
        "after": "getBoard(boardId: string, opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/blocked-words",
        "before": "listBlockedWords(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<BlockedWord>>",
        "after": "listBlockedWords(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/boards",
        "before": "listBoards(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Board>>",
        "after": "listBoards(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/boards/{board_id}",
        "before": "getBoard(boardId: string, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<Board>",
        "after": "getBoard(boardId: string, opts: { query?: { populate?: boolean } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/boards/{board_id}/lists",
        "before": "getLists(boardId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Board>>",
        "after": "getLists(boardId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/boards/{board_id}/lists/{list_id}",
        "before": "getList(boardId: string, listId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Board>",
        "after": "getList(boardId: string, listId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/boards/{id}/cards",
        "before": "getCardsV1(id: string, opts: { query?: { limit?: number; order?: string; direction_order?: string; name?: string; search?: string; campaign?: string; source?: string; person?: string; organization?: string; user?: string; sector?: string; status?: string; product?: string; reason?: string; rating?: number; tags?: string[]; populate?: string[]; board_populate?: string[]; start_date?: string; end_date?: string; field_date?: string; created_at?: string; updated_at?: unknown; has_next_task?: boolean; next_task_start_date?: unknown; prediction_date?: unknown; entry_date?: unknown; finished_at?: unknown; next_task_type?: string; custom_fields?: string; list?: string; highlight_old_cards?: boolean; custom_id?: string } & Record<string, unknown> } = {}): Promise<Paged<Board>>",
        "after": "getCardsV1(id: string, opts: { query?: { limit?: number; order?: string; direction_order?: string; name?: string; search?: string; campaign?: string; source?: string; person?: string; organization?: string; user?: string; sector?: string; status?: string; product?: string; reason?: string; rating?: number; tags?: string[]; populate?: string[]; board_populate?: string[]; start_date?: string; end_date?: string; field_date?: string; created_at?: string; updated_at?: unknown; has_next_task?: boolean; next_task_start_date?: unknown; prediction_date?: unknown; entry_date?: unknown; finished_at?: unknown; next_task_type?: string; custom_fields?: string; list?: string; highlight_old_cards?: boolean; custom_id?: string } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/boards/{id}/reports",
        "before": "getReports(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Board>>",
        "after": "getReports(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/campaigns",
        "before": "listCampaigns(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Campaign>>",
        "after": "listCampaigns(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/campaigns/{campaign_id}",
        "before": "getCampaign(campaignId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Campaign>",
        "after": "getCampaign(campaignId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/cards",
        "before": "listCardsV1(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; name?: string; search?: string; campaign?: string; source?: string; list?: string; custom_id?: string; board?: string; person?: string; organization?: string; user?: string; product?: string; service?: string; sector?: string; status?: string; rating?: string; tags?: string[]; followers?: string[]; users?: string[]; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; created_at?: string; updated_at?: unknown; finished_at?: unknown; prediction_date?: unknown; entry_date?: unknown; next_task_start_date?: unknown; next_task_type?: string; has_next_task?: string; custom_fields?: string[]; highlight_old_cards?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Card>>",
        "after": "listCardsV1(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; name?: string; search?: string; campaign?: string; source?: string; list?: string; custom_id?: string; board?: string; person?: string; organization?: string; user?: string; product?: string; service?: string; sector?: string; status?: string; rating?: string; tags?: string[]; followers?: string[]; users?: string[]; populate?: string[]; start_date?: string; end_date?: string; field_date?: string; created_at?: string; updated_at?: unknown; finished_at?: unknown; prediction_date?: unknown; entry_date?: unknown; next_task_start_date?: unknown; next_task_type?: string; has_next_task?: string; custom_fields?: string[]; highlight_old_cards?: boolean } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/cards/{card_id}",
        "before": "getCard(cardId: string, opts: { query?: { params?: string; flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<Card>",
        "after": "getCard(cardId: string, opts: { query?: { params?: string; flow_execution?: boolean; user?: boolean } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/cards/{card_id}/costs",
        "before": "getCosts(cardId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; entity_type?: string; start_date?: string; end_date?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Card>>",
        "after": "getCosts(cardId: string, opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; entity_type?: string; start_date?: string; end_date?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/cards/{card_id}/purge",
        "before": "getPurge(cardId: string, opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Card>>",
        "after": "getPurge(cardId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/classes",
        "before": "listClasses(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Class>>",
        "after": "listClasses(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/comments",
        "before": "listComments(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<Paged<Comment>>",
        "after": "listComments(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/connections",
        "before": "listConnectionsV1(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; name?: string; key?: string; type?: string; generic_type?: string; types?: string[]; status?: string; populate?: string[]; ids?: string[]; is_deleted?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Connection>>",
        "after": "listConnectionsV1(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; name?: string; key?: string; type?: string; generic_type?: string; types?: string[]; status?: string; populate?: string[]; ids?: string[]; is_deleted?: boolean } & Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/connections/availables",
        "before": "getAvailables(opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Connection>>",
        "after": "getAvailables(opts: { query?: Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/connections/counters",
        "before": "getCounters(opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Connection>>",
        "after": "getCounters(opts: { query?: Record<string, unknown> } = {}): Promise<unknown>"
      },
      {
        "endpoint": "GET /v1/workspaces/{workspace_id}/con```
