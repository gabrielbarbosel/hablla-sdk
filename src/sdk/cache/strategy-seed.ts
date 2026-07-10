import type { AuthStrategy } from '../core/strategy';

/**
 * Known per-endpoint auth strategies, keyed by `${method}:${rawPath}` exactly as the
 * HTTP client builds the key (mind the `{workspace_id}`/`{connection_id}` param
 * names — the old script map used stale names and never matched).
 *
 * This seeds the client so a stateless isolate does not waste a workspace 401 to
 * re-learn a Bearer-only endpoint on every contact — the template send is the hot
 * one. Best-effort and always safe to extend: unknown endpoints default to
 * workspace-first, and any wrong hint self-corrects via the 401/403 fallback.
 */
export const STRATEGY_SEED: Record<string, AuthStrategy> = {
    /* Vazio de propósito: nada de estratégia hardcoded. O mapa se preenche "ao
       natural" — descoberto em runtime pelo fallback workspace↔bearer. A persistência
       entre runs (opcional) é assar o mapa aprendido nesta classe, como o token no
       W_Variables — não hardcodar aqui. */
};
