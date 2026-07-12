import { HabllaClient } from '../../sdk/client';
import type { HabllaVariables } from '../../sdk/variables';
import { UrlFetchTransport } from './transport';
import { PropertiesStrategyCache } from './properties-strategy-cache';
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
 * GET em lote PARALELO via `UrlFetchApp.fetchAll`, autenticado pelo token que o
 * próprio SDK gerencia (`client.auth.token()` — força refresh quando preciso).
 *
 * Existe porque o {@link UrlFetchTransport} é síncrono e SERIAL: uma varredura de
 * dezenas de recursos (ex.: tracking de campanha grande — flows-executions/persons)
 * estouraria o limite de 6min do GAS se feita 1-a-1. Este é o único ponto de
 * paralelismo; o resto do app usa `runSync(() => hablla.x.y())` normalmente.
 *
 * `paths` podem conter o placeholder `{ws}` (trocado pelo workspaceId). Retorna um
 * array ALINHADO a `paths` com o JSON parseado, ou `null` em erro/non-2xx (mesmo
 * contrato do antigo apiGetAll_). Uso no Code.gs: `Hablla.getAll(paths)`.
 */
function makeGetAll(client: HabllaClient, base: string, workspaceId: string): (paths: string[]) => unknown[] {
    return function getAll(paths: string[]): unknown[] {
        const out: unknown[] = new Array(paths.length).fill(null);
        if (paths.length === 0) return out;

        // Token via SDK: resolve inline sob o Promise síncrono do docker, depois restaura.
        const g = globalThis as unknown as GasGlobal;
        const nativePromise = g.Promise;
        const nativeSetTimeout = g.setTimeout;
        g.Promise = SyncPromise;
        g.setTimeout = gasSetTimeout;
        let token: string;
        try {
            token = unwrap(client.auth.token());
        } finally {
            g.Promise = nativePromise;
            g.setTimeout = nativeSetTimeout;
        }
        const authorization = 'Bearer ' + token;

        for (let offset = 0; offset < paths.length; offset += FETCH_ALL_BATCH) {
            const slice = paths.slice(offset, offset + FETCH_ALL_BATCH);
            const requests = slice.map((path) => ({
                url: base + path.replace('{ws}', workspaceId),
                method: 'get',
                headers: { Authorization: authorization },
                muteHttpExceptions: true,
            }));
            let responses: Array<{ getResponseCode(): number; getContentText(): string }>;
            try {
                responses = UrlFetchApp.fetchAll(requests);
            } catch {
                continue; // lote inteiro falhou → mantém null alinhado
            }
            for (let i = 0; i < responses.length; i++) {
                const response = responses[i];
                if (!response) continue;
                const status = response.getResponseCode();
                if (status >= 200 && status < 300) {
                    try { out[offset + i] = JSON.parse(response.getContentText()); } catch { /* mantém null */ }
                }
            }
        }
        return out;
    };
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
    g.hablla = client;
    g.Hablla = { client, runSync, unwrap, getAll: makeGetAll(client, vars.baseUrl ?? 'https://api.hablla.com', vars.workspaceId) };
    return client;
}

installHabllaClient();
