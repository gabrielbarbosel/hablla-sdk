import * as fs from 'fs';
import type { AuthStrategy, StrategyCache } from '../../sdk/core/strategy';

/** Durable {@link StrategyCache} backed by a local JSON file. */
export class FileStrategyCache implements StrategyCache {
    constructor(private readonly file: string) {}

    async load(): Promise<Record<string, AuthStrategy>> {
        try {
            return JSON.parse(fs.readFileSync(this.file, 'utf8')) as Record<string, AuthStrategy>;
        } catch {
            return {};
        }
    }

    async save(map: Record<string, AuthStrategy>): Promise<void> {
        fs.writeFileSync(this.file, JSON.stringify(map, null, 2), 'utf8');
    }
}
