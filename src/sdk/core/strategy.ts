export type AuthStrategy = 'workspace' | 'bearer';

/**
 * Persistence port for the per-endpoint auth strategy map (DIP). Runtimes provide
 * a durable implementation: a JSON file locally, or a Hablla script in the RPO
 * sandbox. The default is in-memory only.
 */
export interface StrategyCache {
    load(): Promise<Record<string, AuthStrategy>>;
    save(map: Record<string, AuthStrategy>): Promise<void>;
}

/** Non-persistent {@link StrategyCache}. */
export class MemoryStrategyCache implements StrategyCache {
    private map: Record<string, AuthStrategy> = {};

    async load(): Promise<Record<string, AuthStrategy>> {
        return { ...this.map };
    }

    async save(map: Record<string, AuthStrategy>): Promise<void> {
        this.map = { ...map };
    }
}
