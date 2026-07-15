import * as fs from 'fs';
import type { AuthStrategy, StrategyCache } from '../../sdk/core/strategy';

/**
 * Durable {@link StrategyCache} backed by a local JSON file, floored by an
 * optional seed. The seed supplies the known Bearer-only endpoints so the very
 * first call routes correctly (some of them return `500` — not `401` — under the
 * workspace token, which the http-client cannot self-correct on a non-idempotent
 * POST); persisted values always override the seed, so a learned correction wins.
 */
export class FileStrategyCache implements StrategyCache {
    constructor(private readonly file: string, private readonly seed: Record<string, AuthStrategy> = {}) {}

    async load(): Promise<Record<string, AuthStrategy>> {
        try {
            return { ...this.seed, ...(JSON.parse(fs.readFileSync(this.file, 'utf8')) as Record<string, AuthStrategy>) };
        } catch {
            return { ...this.seed };
        }
    }

    async save(map: Record<string, AuthStrategy>): Promise<void> {
        fs.writeFileSync(this.file, JSON.stringify(map, null, 2), 'utf8');
    }
}
