import type { StrategyCache, AuthStrategy } from '../../sdk/core/strategy';

declare const PropertiesService: {
    getScriptProperties(): {
        getProperty(key: string): string | null;
        setProperty(key: string, value: string): void;
    };
};

declare const LockService: {
    getScriptLock(): { tryLock(timeoutMs: number): boolean; releaseLock(): void };
};

const KEY = 'HABLLA_STRATEGY_CACHE';

/** Estratégia default por endpoint (workspace-first); nunca é persistida — ver {@link PropertiesStrategyCache.save}. */
const DEFAULT_STRATEGY: AuthStrategy = 'workspace';

/** Espera no máximo isto pelo lock; sem lock, cai pra gravação direta (auto-corrigível). */
const LOCK_TIMEOUT_MS = 1000;

/**
 * Cache de estratégia de auth durável e compartilhado entre usuários, via
 * `PropertiesService` (Script Properties). Sobrevive entre execuções (cada
 * `google.script.run` é execução nova), evitando re-descobrir a estratégia toda vez.
 *
 * Só as entradas que DIVERGEM do default ({@link DEFAULT_STRATEGY}) são persistidas.
 * O http-client grava toda estratégia bem-sucedida — inclusive a default 'workspace' —
 * então, sem podar, o mapa acumularia uma entrada por endpoint chamado (~100+ métodos)
 * e estouraria o limite de 9KB por valor do Script Properties; ao estourar, o
 * `setProperty` lançaria e a persistência degradaria em silêncio. Como `load()` já
 * trata ausência como default, omitir as entradas default é lossless.
 */
export class PropertiesStrategyCache implements StrategyCache {
    load(): Promise<Record<string, AuthStrategy>> {
        const raw = PropertiesService.getScriptProperties().getProperty(KEY);
        let map: Record<string, AuthStrategy> = {};
        try { if (raw) map = JSON.parse(raw); } catch { map = {}; }
        return Promise.resolve(map);
    }

    save(map: Record<string, AuthStrategy>): Promise<void> {
        const pruned: Record<string, AuthStrategy> = {};
        for (const key of Object.keys(map)) {
            const value = map[key];
            if (value !== undefined && value !== DEFAULT_STRATEGY) pruned[key] = value;
        }
        // Lock curto pra não sobrescrever a gravação de uma execução concorrente; se
        // não conseguir o lock (ou LockService não existir), grava mesmo assim — o
        // mapa é auto-corrigível (uma estratégia errada se corrige no próximo 401/403).
        let lock: { tryLock(timeoutMs: number): boolean; releaseLock(): void } | undefined;
        try { lock = LockService.getScriptLock(); lock.tryLock(LOCK_TIMEOUT_MS); } catch { lock = undefined; }
        try {
            PropertiesService.getScriptProperties().setProperty(KEY, JSON.stringify(pruned));
        } catch { /* quota: segue */ }
        finally { try { lock?.releaseLock(); } catch { /* ok */ } }
        return Promise.resolve();
    }
}
