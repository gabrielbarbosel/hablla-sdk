# Changelog

## v0.3.0 (2026-09-16)

**Classification:** `breaking` — endpoints +22 / -15 / ~0 incompatible / 5 extended.

### Removed endpoints

- `DELETE /v1/workspaces/{workspace_id}/temp-tokens/{temp_token_id} (tempTokens)`
- `GET /v1/authentication/verify-email (authentication)`
- `GET /v1/hablla-docs (habllaDocs)`
- `GET /v1/legal-entities (legalEntities)`
- `GET /v1/legal-entities/user/{user_id} (legalEntities)`
- `GET /v1/workspaces/{workspace_id}/temp-tokens (tempTokens)`
- `POST /v1/authentication/login (authentication)`
- `POST /v1/authentication/register-with-external (authentication)`
- `POST /v1/authentication/register-with-password (authentication)`
- `POST /v1/enrichment/check-document (enrichment)`
- `POST /v1/hablla-docs (habllaDocs)`
- `POST /v1/legal-entities (legalEntities)`
- `POST /v1/workspaces/{workspace_id}/temp-tokens (tempTokens)`
- `PUT /v1/hablla-docs/{hablla_doc_id} (habllaDocs)`
- `PUT /v1/legal-entities/{legal_entity_id} (legalEntities)`

### Removed exports

- `gen_enrichment.ts#Enrichment`
- `gen_habllaDocs.ts#HabllaDocs`
- `gen_legalEntities.ts#LegalEntities`
- `gen_tempTokens.ts#TempToken`
- `gen_tempTokens.ts#TempTokens`

### Added endpoints

- `GET /v1/workspaces/{workspace_id}/connections/{connection_id}/templates/{template_id}/analytics (connections)`
- `GET /v1/workspaces/{workspace_id}/meta/analytics (meta)`
- `GET /v1/workspaces/{workspace_id}/meta/profile (meta)`
- `GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/services-per-organization (reports)`
- `GET /v1/workspaces/{workspace_id}/reports/alloy-reports/services/services-per-person (reports)`
- `GET /v1/workspaces/{workspace_id}/reports/alloy-reports/workspace-users/history (reports)`
- `GET /v2/authentication/verify-email (authentication)`
- `GET /v2/workspaces/{workspace_id}/meta/auth (meta)`
- `PATCH /v1/workspaces/{workspace_id}/organizations/{organization_id}/pin-person (organizations)`
- `PATCH /v1/workspaces/{workspace_id}/organizations/{organization_id}/pin-person/remove (organizations)`
- `POST /v1/authentication/logout (authentication)`
- `POST /v1/workspaces/{workspace_id}/connections/meta-fanpage (connections)`
- `POST /v1/workspaces/{workspace_id}/connections/meta-fanpage-and-instagram (connections)`
- `POST /v1/workspaces/{workspace_id}/connections/whatsapp-messaging (connections)`
- `POST /v1/workspaces/{workspace_id}/meta/fanpage-auth (meta)`
- `POST /v1/workspaces/{workspace_id}/meta/instagram-auth (meta)`
- `POST /v1/workspaces/{workspace_id}/meta/whatsapp-auth (meta)`
- `POST /v2/authentication/login (authentication)`
- `POST /v2/authentication/register-with-external (authentication)`
- `POST /v2/authentication/register-with-password (authentication)`
- `POST /v2/workspaces/{workspace_id}/meta/auth (meta)`
- `PUT /v1/workspaces/{workspace_id}/meta/profile (meta)`

### Extended signatures (new optional query keys)

- `GET /v1/workspaces/{workspace_id}/connections (connections)`
  - before: `listConnectionsV1(opts: { query?: { page?: string; limit?: number; order?: string; direction_order?: string; name?: string; key?: string; type?: ConnectionChannelCode; generic_type?: ConnectionStatusCode; types?: string[]; status?: ConnectionStatusCode; populate?: string[]; ids?: string[]; is_deleted?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Connection>>`
  - after: `listConnectionsV1(opts: { query?: { start_date?: string; end_date?: string; field_date?: string; created_at?: unknown; updated_at?: unknown; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; key?: string; type?: ConnectionChannelCode; generic_type?: ConnectionStatusCode; types?: string[]; status?: ConnectionStatusCode; populate?: string[]; ids?: string[]; is_deleted?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Connection>>`
- `GET /v1/workspaces/{workspace_id}/reasons (reasons)`
  - before: `listReasons(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; sector?: string; type?: ReasonTypeCode; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Reason>>`
  - after: `listReasons(opts: { query?: { filters?: string; start_date?: string; end_date?: string; field_date?: string; created_at?: unknown; updated_at?: unknown; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; sector?: string; type?: ReasonTypeCode; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Reason>>`
- `GET /v1/workspaces/{workspace_id}/sessions (sessions)`
  - before: `listSessions(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; key?: string; connection?: string; category?: string; user_initiated?: string; two_way_enable?: boolean; has_error?: boolean; is_valid?: boolean; expire_at?: string; type?: SessionTypeCode; populate?: string; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<Paged<Session>>`
  - after: `listSessions(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; key?: string; connection?: string; person?: string; category?: string; user_initiated?: string; two_way_enable?: boolean; has_error?: boolean; is_valid?: boolean; expire_at?: string; type?: SessionTypeCode; populate?: string; start_date?: string; end_date?: string; field_date?: string } & Record<string, unknown> } = {}): Promise<Paged<Session>>`
- `GET /v1/workspaces/{workspace_id}/tags (tags)`
  - before: `listTags(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; sector?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Tag>>`
  - after: `listTags(opts: { query?: { filters?: string; start_date?: string; end_date?: string; field_date?: string; created_at?: unknown; updated_at?: unknown; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; sector?: string; populate?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Tag>>`
- `GET /v2/workspaces/{workspace_id}/connections (connections)`
  - before: `listConnections(opts: { query?: { filters?: string; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; key?: string; type?: ConnectionChannelCode; generic_type?: ConnectionStatusCode; types?: string[]; status?: ConnectionStatusCode; populate?: string[]; ids?: string[]; is_deleted?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Connection>>`
  - after: `listConnections(opts: { query?: { filters?: string; start_date?: string; end_date?: string; field_date?: string; created_at?: unknown; updated_at?: unknown; page?: string; limit?: number; order?: string; direction_order?: string; name?: string; key?: string; type?: ConnectionChannelCode; generic_type?: ConnectionStatusCode; types?: string[]; status?: ConnectionStatusCode; populate?: string[]; ids?: string[]; is_deleted?: boolean } & Record<string, unknown> } = {}): Promise<Paged<Connection>>`

### Files

- added `gen_meta.ts`
- removed `gen_enrichment.ts`
- removed `gen_habllaDocs.ts`
- removed `gen_legalEntities.ts`
- removed `gen_tempTokens.ts`
- changed `gen_authentication.ts`
- changed `gen_cards.ts`
- changed `gen_connections.ts`
- changed `gen_enums.ts`
- changed `gen_organizations.ts`
- changed `gen_reasons.ts`
- changed `gen_reports.ts`
- changed `gen_services.ts`
- changed `gen_sessions.ts`
- changed `gen_tags.ts`
