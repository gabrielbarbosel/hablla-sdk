import type { AuthStrategy, StrategyCache } from '../../sdk/core/strategy';
import type { HabllaCache } from '../../sdk/cache/cache';

/**
 * {@link StrategyCache} backed by the published `W_Cache` class
 * (`globalThis.HABLLA_CACHE`). `load()` seeds the client from it at zero request
 * cost; `save()` writes learned strategies back for the current run only (there is
 * no cross-run memory — persistence would need a class rewrite). Reads are lazy and
 * tolerant: if `W_Cache` is not loaded, it degrades to an empty map, i.e. the plain
 * workspace-first default.
 */
export class GlobalStrategyCache implements StrategyCache {
    private bag(): HabllaCache | undefined {
        return (globalThis as unknown as { HABLLA_CACHE?: HabllaCache }).HABLLA_CACHE;
    }

    async load(): Promise<Record<string, AuthStrategy>> {
        return this.bag()?.strategies() ?? {};
    }

    async save(map: Record<string, AuthStrategy>): Promise<void> {
        this.bag()?.mergeStrategies(map);
    }
}
