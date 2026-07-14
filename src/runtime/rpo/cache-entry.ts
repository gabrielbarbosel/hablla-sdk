import { HabllaCache } from '../../sdk/cache/cache';

/**
 * RPO bootstrap for the shared cache. Bundled into the `W_Cache` class, it exposes an
 * EMPTY {@link HabllaCache} as `globalThis.HABLLA_CACHE` so every class, script and
 * flow reads it with no request cost — the same free-per-isolate pattern as
 * `W_Variables`/`W_Utils`. Sem seed hardcoded de propósito: o mapa de estratégia se
 * popula pelo USO e persiste (só zera se explicitamente mandado). Idempotente: uma
 * instância existente (com escritas do run) é mantida.
 */
export function installHabllaCache(): void {
    const g = globalThis as unknown as { HABLLA_CACHE?: HabllaCache };
    g.HABLLA_CACHE ??= new HabllaCache({ strategies: {} });
}

installHabllaCache();
