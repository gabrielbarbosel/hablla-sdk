# Changelog

## v0.5.0 (2026-09-17)

**Classification:** `breaking` — a requisição do disparo por workspace ganha as variáveis do template e as duas políticas novas, e perde o campo de primeiro nome; `DispatchProgress` passa a carregar o orçamento de chamadas.

### Adicionado

- Variáveis do corpo por origem declarada: cada variável do template vem de um campo de pessoa (a coluna da audiência mapeada para ele) ou de um valor digitado, na ordem do template, com reformatação opcional por variável (`firstName`, `capitalize`, `upperCase`) desligada por padrão. Um template pode ter nenhuma, uma ou várias.
- `humanOwnerPolicy`: pessoa já pertencente a outro assessor humano é mantida por padrão e trocada sob demanda, compondo com a política de dono de sistema.
- `existingPersonFieldPolicy`: em pessoa existente, atualiza só os campos que a linha enviou (padrão) ou nada.
- `jobIds(phases)` e `listJobs(phases)`: listagem dos jobs armazenados por conjunto de fases, do mais novo para o mais velho.
- `DispatchProgress.callBudget`: estimativa, gasto e restante das chamadas do job, mais a cota que a estimativa conferiu.
- `start(jobId, { exclusion })`: exclusão relida na confirmação, aplicada antes de qualquer escrita.
- `Hablla.formatVariableValue` e `utils.capitalizeWords`, para a prévia do app reformatar com a mesma função do disparo.

### Alterado

- O valor de uma variável vai literalmente como veio da coluna ou do campo digitado; o domínio não calcula mais primeiro nome nem capitaliza por conta própria.
- `decideOwnerChange` recebe as settings de dono em vez de dois argumentos soltos, e `OwnerChange` ganha a variante `replaceHumanOwners`.
- A campanha monta `variables.body` com uma entrada por variável e `'<i>_is_expression': false` por índice.

### Removido

- `WorkspaceDispatchRequest.firstNameFieldId` e `DispatchContact.firstName`, com a regra que proibia a linha de trazer o campo de primeiro nome.

## v0.4.0 (2026-09-17)

**Classification:** `breaking` — nova superfície de disparo por token de workspace; `deployToRpo` passa a exigir a verificação de compatibilidade; o disparo em massa por import fica obsoleto.

### Adicionado

- `habllaDomain.workspaceDispatch`: disparo sem fluxo com plan/start/continue/abandon/status, escritas por contato em token de workspace e bearer O(1) por disparo (segmentação, contagem da audiência, campanha v2).
- Exclusão por filtro resolvida antes de qualquer escrita, com teto de páginas, conferência contra o universo contado e retomada entre execuções.
- Runtime GAS: executor de chamadas concorrentes sobre `UrlFetchApp.fetchAll`, store de jobs na planilha e janela de execução.
- Verificação de compatibilidade do RPO (estrita e por regressão) e fachada `hablla.dispatch` no `W_HabllaDomain`.

### Alterado

- `deployToRpo` valida tudo antes da primeira escrita e exige `compatibility`.
- `distributeOwners` respeita pesos por dono.

### Obsoleto

- `habllaDomain.massDispatch` (caminho por import), substituído pelo disparo por token de workspace.

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
