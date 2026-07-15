/**
 * The cache layer: a reusable in-isolate cache published as its own class
 * (`W_Cache` → `globalThis.HABLLA_CACHE`). Sem seed hardcoded — o mapa de estratégia
 * se popula pelo USO e persiste (ver as StrategyCache por runtime).
 */
export { HabllaCache } from './cache';
export { STRATEGY_SEED } from './strategy-seed';
