# Roadmap priorizado — Gerador (codegen) e SDK Hablla

Priorização por **valor ÷ esforço** (valor: high=3/med=2/low=1; esforço: small=1/med=2/large=3). Três trilhas: **A) Capturar no codegen JÁ**, **B) Ganhos de tipagem**, **C) Capacidades novas do SDK (fases futuras)**.

---

## A) CAPTURAR NO CODEGEN AGORA — extração/emit
Correções de fidelidade do fio. A maioria já existe no *legacy* e é só reaproveitar; erram silenciosamente hoje.

| # | Item | V÷E | Ação | Fonte a reusar |
|---|------|-----|------|----------------|
| A1 | **Alias por ObjectPattern (`{workspace:Rn}`→`{workspace}`)** — coração da deobfuscação | 3.0 | Portar integralmente | `extract-functions.js:15-35, 89-94` |
| A2 | **Extração keyed no NOME do método (METHOD_MAP), nunca na instância `new APIClient()`** | 3.0 | Reusar; descartar o `extract_endpoints_B9.js` (keyava na instância = bug frágil) | `extract-functions.js:9,62-64` |
| A3 | **`createWithFile`/`updateWithFile` ⇒ multipart AUTOMÁTICO** (POST vs PUT) | 3.0 | Flag `multipart:true` no METHOD_MAP; **elimina a camada de overrides** (hoje só 1 de 6 endpoints tratado à mão em `overrides.ts:85`) | 6 endpoints: annotations, cdn, feed-posts, import, campaigns/sheet, services/{id}/messages, PUT feed-posts/{id} |
| A4 | **Tabela fixa wrapper→verbo** (`update`=PUT, não PATCH; `postAgent`=POST; etc.) | 2.0 | `{get,getWithConfig}→GET; {post,postAgent,createWithFile}→POST; {put,update,updateWithFile}→PUT; patch→PATCH; delete→DELETE`. Nunca inferir verbo por nome | — |
| A5 | **`delete`: 2º arg é config axios** (`.params`→query, `.data`→body), não body posicional | 2.0 | Ramo especial no emit de delete | — |
| A6 | **3º arg `{params}` em post/update ⇒ `query?` em métodos de escrita** (filtros em POST-list) | 2.0 | SDK já suporta `opts.query` em post/put; só marcar `hasQuery` | `getCampaignEmailsStatsList`, `replyInstagramComment` |
| A7 | **Parse hardening do bundle** (`errorRecovery`, `sourceType:'unambiguous'`, skip loc/comments, heap 8GB) | 2.0 | Padrão comum de todos os extractors legacy | `extract-functions.js:11` |
| A8 | **`getWithConfig`: serializer que faz `JSON.stringify` de objetos de 1º nível** (`?filters={...}`, NÃO qs-indices) + escape-hatch de config (responseType/headers/signal) | 1.5 | Flag `configGet:true`; query vem de `.params`. Hoje emite `.get` qs-indices ⇒ **filtro aninhado ignorado pelo backend** | `deobfuscated.js:174050` |
| A9 | **2ª passada AST: multipart NÃO declarado no swagger** — cruzar `createWithFile` por (método+path) e sobrescrever `isMultipart` do swagger (que tem ZERO multipart) | 1.5 | Segunda indexação por URL normalizada | mesmos 6 endpoints do A3 |
| A10 | **Pinagem contra `openapi.prev.json` + tier terciário `prev-only`** (reinjeta ops sumidas; nomes de método/param não churnam) | 1.5 | Stage `stabilize` pós-merge. Hoje `pipeline.ts` não tem diff nem guarda: bundle quebrado gera SDK menor em silêncio | `build-openapi.js:217-248, 318-342` |
| A11 | **Canary de invariantes** (abortar em vez de emitir SDK vazio): `ops≥500`, classe `APIClient` com create/updateWithFile presente, 6 endpoints multipart presentes, alias `{workspace}` apareceu N vezes | 1.5 | Falhar ALTO; manter spec anterior no fail | `deobfuscated.js:174026` |
| A12 | **Sweep LIVE read-only (só GET)** — status + estratégia de auth vencedora + shape (chaves+tipos, sem valores); DIFF vs run anterior | 1.5 | Portar `verify_live.js`; etapa opcional pós-emit, sempre READ-ONLY | `verify_live.js:44,61` |
| A13 | **Parse resiliente do swaggerDoc** (regex fast-path + fallback brace-match) **+ descoberta dinâmica do `index-[hash].js`** | 1.0 | `parseSwaggerDoc` já pronto; **ligar `discoverStudioBundleUrls` (órfão em `extract.ts:137`)** | `extract.ts:95-142` |
| A14 | **`sanitizeSchema`** (booleanos JSON-Schema true/false→`{}`/`{not:{}}`) antes de emitir | 1.0 | Aplicar em toda entidade/body inferido | `build-openapi.js:38-58` |
| A15 | **Detectar URL absoluta (host externo Graph/FB)** ⇒ `absoluteUrl:true, skipWorkspaceAuth:true` (auth via `access_token` na query, não Bearer) | 0.5 | Não prefixar baseUrl nem injetar workspace | `getInstagramProfileApi` |

**Sequência sugerida A:** A1–A2 (base) → A3–A6 (verbos/multipart/query) → A7 (robustez parse) → A8–A9 (serialização/multipart oculto) → A10–A12 (durabilidade ao cron) → A13–A15.

---

## B) GANHOS DE TIPAGEM — `unknown`/`string` → tipos ricos
Não muda o fio; melhora DX e corretude de tipos. Depende de `shapes.json`/`bundle-bodies.json` já existentes.

| # | Item | V÷E | Ação |
|---|------|-----|------|
| B1 | **4 envelopes de paginação distintos** (`Paged` / `Counted` / `CursorPaged` / `AggregatePaged`) — `reports/*` NÃO têm page/limit/totalPages; `/quotation` é agregado | 3.0 | Escolher genérico pelo key-set do envelope observado em `shapes.json`. O `Paged<T>` atual **mente** |
| B2 | **Bind `EnumName→campo` por convenção** (`ServiceStatus→Service.status`, `CARD_STATUS→Card.status`…) + override-map p/ irregulares | 3.0 | Cola que ativa as unions do B3 |
| B3 | **Enums TS sobreviventes como IIFE nomeada → union types** (~40 enums: ServiceStatus, IConnectionType/Status, TaskType, MESSAGE_TYPE, AlgorithmEnum, TemplateStatus…) | 1.5 | AST: padrão `})(NAME||(NAME={}))`, coletar `NAME.Key="value"` |
| B4 | **Enrichment de campos por `shapes.json`** (Person v2: `is_blocked`, `customer_status`, `has_duplicate_keys`, `score`, `telegrams`…; troca `emails?:unknown`→tipado) | 1.5 | Re-amostrar objetos/arrays +1 nível p/ virar array-de-objeto tipado |
| B5 | **Enums nos CORPOS de request** → body types dedicados (`CreatePersonBody.status`, `updateFlow.type`, `uploadFiles.language/feedbackType`) em vez de `Partial<Entity>` | 1.5 | `extract-bodies.js` (byFn): valor vindo de array constante ⇒ enum |
| B6 | **Query de ordenação/paginação tipada** (`direction_order:'asc'\|'desc'`; `filters` = JSON-string de `FilterRule[]`; `order`=campo) | 2.0 | Prova no bundle: `class OrderBy{constructor(f,dir="asc")}` + `if(dir==="desc")` |
| B7 | **`populate` = union de relações por entidade** (não boolean): boards→`['sector','lists']`, campaigns→`['user','flow','user_id']` | 1.0 | De `populate_full.json`; opcional: overload que troca campo populado id→objeto |
| B8 | **Retornos cross-resource** (persons/{id}/opened-services → `Service[]`, não `Paged<Person>`) | 1.0 | Casar shape de `results[0]` por similaridade de campos com interfaces conhecidas, em vez de `ref==tag` |
| B9 | **Harvesting de response-shape nos call-sites** (`const {id,name}=await getPersonApi()`) → campos `x-observed` | 1.0 | Portar `extract-entities.js` (NOISE_KEYS barra data/status/map/…) |
| B10 | **Reconstrução de body por saga+form** (HookFormInputTypes→JSON Schema, enums de options, required de rules) | 0.67 | Portar `extract-bodies.js` `fieldToSchema`; precedência byFn→swagger→byTag→generic. Maior esforço, deixar por último |

**Sequência sugerida B:** B1 + B2→B3 (unions) → B4→B5 (enrichment/body) → B6 → B7–B9 → B10.

---

## C) CAPACIDADES NOVAS DO SDK — fases futuras
Features que o studio usa e o SDK não expõe. Promoção manual a `domain/` para os workflows.

| # | Item | V÷E | Nota |
|---|------|-----|------|
| C1 | **CDN upload/delete de 1ª classe** — `POST v1/.../cdn` multipart (`files[]`+`path`+`retain_filename/type`) → `[{filename,file_url}]`; `path` é enum (`/sources/documents`, `/flows/templates`, `/hablla-agent`, `audio_nps`…) | 3.0 | **Pré-requisito** de mídia e feed-posts. Hoje `gen_cdn.createCdn` manda JSON e quebra |
| C2 | **Bulk/batch helpers tipados** — `persons/batch`, `services/batch`, `cards/batch` (exige `data.query.board`), `connections/multiple`, `{id}/sync` | 3.0 | **Ataca o 429 do motor v12**: mutação em massa numa chamada vs loop-por-contato |
| C3 | **Mensageria com anexo/mídia (domain)** — `sendMediaMessageApi` = v2 `services/{id}/messages` multipart (`files[]`,`type`); editar/deletar/patchRead; templates com/sem service | 1.5 | `gen_messages.createMessageV2` hoje é POST JSON = **bug**. Complementa o dispatch (só template) |
| C4 | **Segundo host: agente IA (`postAgent`→`gpt.hablla.com`)** — copilot, hablla-agent (agent-testing), knowledgeBases | 1.5 | **Também é item de codegen** (mapa instância→baseURL). HabllaClient assume baseUrl único; add `agentBaseUrl` + `opts.baseUrl` override |
| C5 | **Export polimórfico + PDF** — mesmo `POST .../export` faz `exportDictionaryData` E `generatePdfServiceApi`; modo discriminado pelo body | 2.0 | Agregar todos call-sites do (método,path) e emitir overloads/união de body |
| C6 | **Campanha por planilha (workflow domain)** — `createWithFile v2 campaigns/sheet` faz disparo em massa nativo | 1.0 | Alternativa nativa ao loop do dispatch (evita 429); irmão do `domain/dispatch` |
| C7 | **Realtime via Firebase** (Firestore `onSnapshot` + RTDB `onValue`) — canais `workspaces/{ws}/services`, `.../messages`, `callLogs`, presença `confirmedUsers/{uid}` | 1.0 | Módulo `domain/realtime` FIXO (não por AST de endpoint). SDK já recebe `firebaseApiKey`. Maior esforço; destrava bots reativos e confirmação de entrega em tempo real |

**Sequência sugerida C:** C1→C2 (small, alto valor, destravam o resto) → C3→C4→C5 → C6 → C7 (large).

---

## Ordem de execução recomendada (cross-trilha)

1. **Fundação de extração (imune ao cron):** A1, A2, A3, A7, A11 — sem isso o resto não é confiável.
2. **Corretude de fio:** A4, A5, A6, A8, A9 (verbos, multipart oculto, serialização de filtros).
3. **Durabilidade:** A10, A12, A13 (pin/prev-only, sweep live, discover dinâmico).
4. **Tipagem de alto ROI:** B1, B2→B3, B4, B5 (paginação correta + unions + enrichment).
5. **Capacidades small/alto valor:** C1, C2 (CDN + batch — atacam bugs reais e o 429).
6. **Capacidades médias:** C3, C4, C5 (mensageria/mídia, host do agente, export).
7. **Fases longas:** B10 (saga bodies), C6 (campaign domain), C7 (realtime).

## Notas de risco/dependência
- **C1 bloqueia C3/C6** (upload é pré-requisito de mídia e feed).
- **A3/A9 bloqueiam C1/C3/C5/C6** — todos são multipart; sem o flag correto o body vai como JSON e o servidor rejeita.
- **B2 depende de B3**; **B1/B4/B8 dependem de `shapes.json` vivo** (⇒ A12 alimenta ambos).
- **A4 é transversal**: errar `update`=PATCH quebra ~31 call-sites de PUT silenciosamente.
- Ganho oculto mais barato de todos: **A3 elimina a camada de `overrides.ts` para multipart** (hoje 1 de 6 endpoints tratado à mão).

Arquivos-chave a reaproveitar (legacy): `extract-functions.js`, `extract-bodies.js`, `extract-entities.js`, `build-openapi.js`, `verify_live.js`. A portar para o pipeline novo: `extract.ts` (`discoverStudioBundleUrls` órfão em :137), `pipeline.ts` (sem stage de stabilize/diff), `emit.ts` (já sabe renderizar multipart — falta o extract produzir o schema).