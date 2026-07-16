import { HabllaClient } from '../../sdk/client';
import { HabllaDomain } from '../../sdk/domain';
import type { HabllaVariables } from '../../sdk/variables';
import type { AuthStrategy } from '../../sdk/core/strategy';
import { HabllaStore, STORE_SCHEMAS } from '../../sdk/store';
import * as utils from '../../sdk/utils';
import { UrlFetchTransport } from './transport';
import { PropertiesStrategyCache } from './properties-strategy-cache';
import { SpreadsheetTableStore } from './spreadsheet-table-store';
import { SyncPromise, unwrap, drainUnhandledRejections } from './sync-promise';

declare const PropertiesService: {
    getScriptProperties(): { getProperty(key: string): string | null };
};
declare const Utilities: { sleep(ms: number): void };
declare const UrlFetchApp: {
    fetchAll(requests: Array<Record<string, unknown>>): Array<{ getResponseCode(): number; getContentText(): string }>;
};

/** Teto de requests por lote no `fetchAll` (igual ao antigo apiGetAll_ hand-rolled). */
const FETCH_ALL_BATCH = 100;

/**
 * Teto do `setTimeout` polifilado. NÃO existe para encurtar o backoff — só para
 * garantir que uma única espera nunca sozinha estoure o limite de execução do GAS
 * (6min). O backoff do http-client em 429 cresce até 20s (`min(1000*2^n, 20000)`);
 * 15s preserva quase toda essa janela (crítica contra o rate limit do motor v12) e
 * ainda cabe folgado nos 360s, mesmo somando as 6 tentativas.
 */
const SET_TIMEOUT_CAP_MS = 15000;

interface GasGlobal {
    HABLLA_ENV?: Partial<HabllaVariables>;
    hablla?: HabllaClient;
    habllaDomain?: HabllaDomain;
    Hablla?: unknown;
    Promise?: unknown;
    setTimeout?: unknown;
}

/** Lê as credenciais: `globalThis.HABLLA_ENV` (se injetado) tem prioridade, senão Script Properties. */
function readVariables(): HabllaVariables {
    const g = globalThis as unknown as GasGlobal;
    const env = g.HABLLA_ENV ?? {};
    const prop = (key: string): string => {
        try { return PropertiesService.getScriptProperties().getProperty(key) ?? ''; } catch { return ''; }
    };
    return {
        workspaceId: env.workspaceId ?? prop('HABLLA_WORKSPACE_ID'),
        refreshToken: env.refreshToken ?? prop('HABLLA_REFRESH_TOKEN'),
        firebaseApiKey: env.firebaseApiKey ?? prop('HABLLA_FIREBASE_API_KEY'),
        workspaceToken: env.workspaceToken ?? (prop('HABLLA_WORKSPACE_TOKEN') || undefined),
        baseUrl: env.baseUrl ?? (prop('HABLLA_BASE_URL') || undefined),
        debug: env.debug,
    };
}

/** `setTimeout` síncrono do GAS: dorme (capado — ver {@link SET_TIMEOUT_CAP_MS}) e chama o callback inline. Só usado no backoff. */
function gasSetTimeout(callback: () => void, ms?: number): number {
    const delay = Math.min(Math.max(0, ms ?? 0), SET_TIMEOUT_CAP_MS);
    if (delay > 0) { try { Utilities.sleep(delay); } catch { /* ok */ } }
    callback();
    return 0;
}

/**
 * Executa uma chamada async do SDK de forma SÍNCRONA (pro `google.script.run`).
 * Instala o Promise síncrono + setTimeout do GAS durante a chamada e restaura depois,
 * pra não afetar o resto do runtime. Uso no Code.gs: `runSync(() => hablla.persons.list())`.
 */
export function runSync<T>(call: () => PromiseLike<T>): T {
    const g = globalThis as unknown as GasGlobal;
    const nativePromise = g.Promise;
    const nativeSetTimeout = g.setTimeout;
    g.Promise = SyncPromise;
    g.setTimeout = gasSetTimeout;
    try {
        return unwrap(call());
    } finally {
        // Restaura os globais SEMPRE (inclusive se `call()` lançou), pra não vazar o
        // Promise/setTimeout síncrono pro resto do runtime.
        g.Promise = nativePromise;
        g.setTimeout = nativeSetTimeout;
        // Qualquer rejeição fire-and-forget durante a chamada teria sumido em
        // silêncio; drena e loga pra deixar rastro (não altera o valor retornado).
        const leaked = drainUnhandledRejections();
        if (leaked.length > 0 && typeof console !== 'undefined') {
            for (const reason of leaked) console.warn('SyncPromise: rejeição não-tratada', reason);
        }
    }
}

/**
 * GET em lote PARALELO via `UrlFetchApp.fetchAll`, resolvendo a auth POR ENDPOINT
 * pelo MESMO strategy cache do caminho single-call (workspace-first → bearer no
 * fallback → grava o que funcionou). Antes cravava `Bearer` em tudo, o que jogava
 * TODAS as leituras pesadas no token bearer (o mesmo que o motor de disparo usa) e
 * ignorava o limite MUITO maior do workspace token. Agora cada endpoint usa o token
 * certo e aprende sozinho — um seed errado se auto-corrige no 401/403.
 *
 * Existe porque o {@link UrlFetchTransport} é síncrono e SERIAL: uma varredura de
 * dezenas de recursos (ex.: tracking de campanha grande) estouraria o limite de 6min
 * do GAS se feita 1-a-1. Este é o único ponto de paralelismo; o resto usa runSync.
 *
 * `paths` podem conter o placeholder `{ws}`. Retorna um array ALINHADO a `paths` com
 * o JSON parseado, ou `null` em erro/non-2xx. Uso no Code.gs: `Hablla.getAll(paths)`.
 */
function makeGetAll(client: HabllaClient, base: string, workspaceId: string): (paths: string[]) => unknown[] {
    const auth = client.auth;

    // Normaliza o path pro MESMO espaço de chave do http-client (`${method}:${rawPath}`):
    // tira a query, volta `{ws}`→`{workspace_id}` e colapsa ids (24-hex) em placeholder.
    const keyOf = (rawPath: string): string =>
        'GET:' + rawPath.split('?')[0]!
            .replace('{ws}', '{workspace_id}')
            .replace(/\/[0-9a-fA-F]{24}(?=\/|$)/g, '/{id}');

    return function getAll(paths: string[]): unknown[] {
        const out: unknown[] = new Array(paths.length).fill(null);
        if (paths.length === 0) return out;

        const g = globalThis as unknown as GasGlobal;
        const nativePromise = g.Promise;
        const nativeSetTimeout = g.setTimeout;

        // Fase 1 — resolve os DOIS headers + a strategy por path, TUDO aqui sob o Promise
        // síncrono. Bearer tem que ser resolvido AGORA (não lazy dentro do fetch): a fase 2
        // roda com o Promise nativo restaurado, e um unwrap() ali estoura ("não resolveu de
        // forma síncrona"). O token fica em cache na instância, então resolver eager é barato.
        g.Promise = SyncPromise;
        g.setTimeout = gasSetTimeout;
        let wsHeader = '';
        let bearerHeader = '';
        const strategyFor: AuthStrategy[] = [];
        try {
            wsHeader = String(unwrap(auth.authorization('workspace')) ?? '');
            bearerHeader = String(unwrap(auth.authorization('bearer')));
            for (let i = 0; i < paths.length; i++) {
                // sem workspace token configurado → nem tenta workspace (evita um 401 à toa).
                strategyFor[i] = wsHeader ? unwrap(auth.resolveStrategy(keyOf(paths[i]!))) : 'bearer';
            }
        } finally {
            g.Promise = nativePromise;
            g.setTimeout = nativeSetTimeout;
        }
        const headerFor = (strategy: AuthStrategy): string =>
            (strategy === 'workspace' && wsHeader) ? wsHeader : bearerHeader;

        // Fase 2 — fetch em lote com fallback de auth (401/403, vira 1x) e backoff (429/503).
        const winner: Array<AuthStrategy | null> = new Array(paths.length).fill(null);
        for (let start = 0; start < paths.length; start += FETCH_ALL_BATCH) {
            const end = Math.min(start + FETCH_ALL_BATCH, paths.length);
            let pending: Array<{ i: number; strategy: AuthStrategy; flipped: boolean }> = [];
            for (let i = start; i < end; i++) pending.push({ i, strategy: strategyFor[i]!, flipped: false });

            for (let attempt = 0; attempt < 4 && pending.length; attempt++) {
                if (attempt > 0) { try { Utilities.sleep(500 * attempt); } catch { /* ok */ } }
                const requests = pending.map((p) => ({
                    url: base + paths[p.i]!.replace('{ws}', workspaceId),
                    method: 'get',
                    headers: { Authorization: headerFor(p.strategy) },
                    muteHttpExceptions: true,
                }));
                let responses: Array<{ getResponseCode(): number; getContentText(): string }>;
                try { responses = UrlFetchApp.fetchAll(requests); } catch { responses = []; }

                const next: typeof pending = [];
                for (let k = 0; k < pending.length; k++) {
                    const p = pending[k]!;
                    const response = responses[k];
                    if (!response) { next.push(p); continue; }
                    const status = response.getResponseCode();
                    if (status >= 200 && status < 300) {
                        try { out[p.i] = JSON.parse(response.getContentText()); } catch { /* mantém null */ }
                        winner[p.i] = p.strategy;
                        continue;
                    }
                    if (status === 429 || status === 503) { next.push(p); continue; } // throttle → re-tenta mesma
                    // QUALQUER outra falha (401/403/400/404/5xx): tenta o outro token UMA vez.
                    // Espelha o fallback do single-call — endpoints bearer-only (ex.: tracking)
                    // não dão 401 limpo no workspace, então flipar só em 401/403 os deixava vazios.
                    // GET é idempotente, então retentar é seguro.
                    if (!p.flipped && wsHeader) {
                        p.strategy = p.strategy === 'workspace' ? 'bearer' : 'workspace';
                        p.flipped = true;
                        next.push(p);
                        continue;
                    }
                    // já tentou os dois (ou não há workspace token): desiste, out[p.i] fica null.
                }
                pending = next;
            }
        }

        // Fase 3 — grava as strategies vencedoras (recordStrategy dedupa por chave e só
        // persiste em mudança, então uma vez estável isto vira no-op).
        g.Promise = SyncPromise;
        g.setTimeout = gasSetTimeout;
        try {
            for (let i = 0; i < paths.length; i++) {
                const strategy = winner[i];
                if (strategy) unwrap(auth.recordStrategy(keyOf(paths[i]!), strategy));
            }
        } finally {
            g.Promise = nativePromise;
            g.setTimeout = nativeSetTimeout;
        }

        return out;
    };
}

/**
 * Store da planilha-como-banco (Fase 2): um {@link HabllaStore} com o catálogo de abas sobre o
 * {@link SpreadsheetTableStore}. O id da planilha vem de `HABLLA_SHEET_ID` (Script Property);
 * ausente ⇒ planilha ativa (script container-bound). Construção é barata — nada de I/O até um
 * read/write. Uso no Code.gs: `runSync(() => Hablla.store.all('sectors'))`,
 * `runSync(() => Hablla.store.migrate())`.
 */
function makeStore(): HabllaStore {
    let sheetId: string | undefined;
    try { sheetId = PropertiesService.getScriptProperties().getProperty('HABLLA_SHEET_ID') || undefined; } catch { sheetId = undefined; }
    const backend = new SpreadsheetTableStore({ spreadsheetId: sheetId });
    return new HabllaStore(backend, STORE_SCHEMAS);
}

/** Instancia o client GAS (UrlFetchApp + cache em Script Properties) e expõe os globais. */
export function installHabllaClient(): HabllaClient {
    const vars = readVariables();
    const client = new HabllaClient({
        ...vars,
        transport: new UrlFetchTransport(),
        strategyCache: new PropertiesStrategyCache(),
    });
    const g = globalThis as unknown as GasGlobal;
    const domain = new HabllaDomain(client);
    g.hablla = client;
    g.habllaDomain = domain;
    g.Hablla = {
        client,
        domain,
        runSync,
        unwrap,
        getAll: makeGetAll(client, vars.baseUrl ?? 'https://api.hablla.com', vars.workspaceId),
        store: makeStore(),
        utils,
    };
    return client;
}

installHabllaClient();
