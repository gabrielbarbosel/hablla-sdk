import { HabllaCache } from '../../sdk/cache/cache';
import { STRATEGY_SEED } from '../../sdk/cache/strategy-seed';

/**
 * RPO bootstrap for the shared cache. Bundled into the `W_Cache` class, it exposes a
 * seeded {@link HabllaCache} as `globalThis.HABLLA_CACHE` so every class, script and
 * flow reads it with no request cost — the same free-per-isolate pattern as
 * `W_Variables`/`W_Utils`. Idempotent: an existing instance (with any run-local
 * writes) is kept.
 */
export function installHabllaCache(): void {
    const g = globalThis as unknown as { HABLLA_CACHE?: HabllaCache };
    g.HABLLA_CACHE ??= new HabllaCache({ strategies: STRATEGY_SEED });
}

installHabllaCache();
