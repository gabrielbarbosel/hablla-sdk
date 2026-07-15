import { describe, it, expect } from 'vitest';
import { STRATEGY_SEED } from './strategy-seed';
import { HabllaCache } from './cache';
import { GlobalStrategyCache } from '../../runtime/rpo/global-strategy-cache';

describe('STRATEGY_SEED', () => {
    it('keys are all Bearer and in `${METHOD}:${rawPath}` shape with placeholders', () => {
        const keys = Object.keys(STRATEGY_SEED);
        expect(keys.length).toBe(8);
        for (const key of keys) {
            expect(STRATEGY_SEED[key]).toBe('bearer');
            expect(key).toMatch(/^(GET|POST|PUT|PATCH|DELETE):\/v[12]\/workspaces\/\{workspace_id\}\//);
        }
    });

    it('covers the hot mass-dispatch endpoints (verbatim path literals)', () => {
        expect(STRATEGY_SEED['POST:/v2/workspaces/{workspace_id}/campaigns/sheet']).toBe('bearer');
        expect(STRATEGY_SEED['POST:/v1/workspaces/{workspace_id}/services/batch']).toBe('bearer');
        expect(STRATEGY_SEED['PUT:/v1/workspaces/{workspace_id}/services/{service_id}/transfer']).toBe('bearer');
    });

    it('does NOT seed workspace-token endpoints (persons/create-or-update stays default)', () => {
        expect(STRATEGY_SEED['POST:/v1/workspaces/{workspace_id}/persons/create-or-update']).toBeUndefined();
    });

    it('flows through the RPO GlobalStrategyCache into resolveStrategy — the stateless isolate reads it free', async () => {
        const g = globalThis as unknown as { HABLLA_CACHE?: HabllaCache };
        const prev = g.HABLLA_CACHE;
        g.HABLLA_CACHE = new HabllaCache({ strategies: STRATEGY_SEED });
        try {
            const loaded = await new GlobalStrategyCache().load();
            expect(loaded['POST:/v1/workspaces/{workspace_id}/services/batch']).toBe('bearer');
            expect(loaded).toEqual(STRATEGY_SEED);
        } finally {
            g.HABLLA_CACHE = prev;
        }
    });
});
