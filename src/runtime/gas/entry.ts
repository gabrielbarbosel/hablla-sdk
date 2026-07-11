import { HabllaClient } from '../../sdk/client';
import type { HabllaVariables } from '../../sdk/variables';
import { UrlFetchTransport } from './transport';
import { PropertiesStrategyCache } from './properties-strategy-cache';
import { SyncPromise, unwrap, drainUnhandledRejections } from './sync-promise';

declare const PropertiesService: {
    getScriptProperties(): { getProperty(key: string): string | null };
};
declare const Utilities: { sleep(ms: number): void };

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
    g.Hablla = { client, runSync, unwrap };
    return client;
}

installHabllaClient();
