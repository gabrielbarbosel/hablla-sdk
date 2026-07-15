import { HabllaCache } from '../../sdk/cache/cache';
import { STRATEGY_SEED } from '../../sdk/cache/strategy-seed';

/**
 * RPO bootstrap for the shared cache. Bundled into the `W_Cache` class, it exposes a
 * {@link HabllaCache} as `globalThis.HABLLA_CACHE` so every class, script and flow reads
 * it with no request cost — the same free-per-isolate pattern as `W_Variables`/`W_Utils`.
 *
 * Seeded with {@link STRATEGY_SEED}: the isolate is stateless (per-contact, no cross-run
 * memory), so the seed is the standing knowledge of which endpoints require Bearer —
 * without it every contact would waste a workspace `401` to re-learn on the hot path. The
 * seed costs zero requests; learned strategies still merge on top within a run. Idempotent:
 * an existing instance (with this run's writes) is kept.
 */
export function installHabllaCache(): void {
    const g = globalThis as unknown as { HABLLA_CACHE?: HabllaCache };
    g.HABLLA_CACHE ??= new HabllaCache({ strategies: STRATEGY_SEED });
}

installHabllaCache();
