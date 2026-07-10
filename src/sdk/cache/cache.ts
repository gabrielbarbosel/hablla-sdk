import type { AuthStrategy } from '../core/strategy';

/**
 * In-isolate cache with a small, stable API. Meant to be published as a class
 * (`globalThis.HABLLA_CACHE`) so any class, script or flow reads it **for free** —
 * no request cost, because it loads with the isolate (like the token in
 * `W_Variables`). Writes live only for the current run (isolates are stateless and
 * per-contact); to persist across runs, rewrite the class code out of band. Seeded
 * at construction with known data (e.g. the per-endpoint auth strategy map).
 */
export class HabllaCache {
    private store: Record<string, Record<string, unknown>> = {};

    constructor(seed: { strategies?: Record<string, AuthStrategy> } = {}) {
        if (seed.strategies) this.store.strategies = { ...seed.strategies };
    }

    /** Reads a namespaced value. */
    get(namespace: string, key: string): unknown {
        return this.store[namespace]?.[key];
    }

    /** Writes a namespaced value (current run only). */
    set(namespace: string, key: string, value: unknown): void {
        (this.store[namespace] ??= {})[key] = value;
    }

    /** A shallow copy of every entry in a namespace. */
    entries(namespace: string): Record<string, unknown> {
        return { ...(this.store[namespace] ?? {}) };
    }

    /** The per-endpoint auth strategy map (the `strategies` namespace). */
    strategies(): Record<string, AuthStrategy> {
        return { ...(this.store.strategies ?? {}) } as Record<string, AuthStrategy>;
    }

    /** Merges learned strategies into the map (current run only). */
    mergeStrategies(map: Record<string, AuthStrategy>): void {
        this.store.strategies = { ...(this.store.strategies ?? {}), ...map };
    }
}
