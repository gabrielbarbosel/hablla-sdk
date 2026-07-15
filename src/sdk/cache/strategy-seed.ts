import type { AuthStrategy } from '../core/strategy';

/**
 * Known per-endpoint auth strategies, keyed by `${method}:${rawPath}` exactly as the
 * HTTP client builds its cache key ({@link HabllaHttpClient} keys on the path TEMPLATE,
 * before `{workspace_id}`/`{service_id}`/`{connection_id}` are substituted — so the
 * placeholder names below must match the resource path literals verbatim).
 *
 * This exists for the stateless runtime. The RPO isolate is per-contact and keeps no
 * cross-run memory ({@link GlobalStrategyCache} `save` only merges within the current
 * isolate), so without a seed every contact would spend a workspace `401` to re-learn a
 * Bearer-only endpoint before retrying — a doubled request on the hot dispatch path. The
 * seed is that missing memory: zero request cost, resolved straight to the right token.
 *
 * Only endpoints that REQUIRE Bearer are listed; everything else defaults to
 * workspace-first (`persons/create-or-update` included — it accepts the workspace token).
 * Best-effort and always safe: a wrong or stale hint self-corrects via the 401/403
 * fallback, and the GAS runtime ignores this (it persists learned strategies in Script
 * Properties, so it self-populates without a seed).
 */
export const STRATEGY_SEED: Record<string, AuthStrategy> = {
    'PUT:/v1/workspaces/{workspace_id}/services/{service_id}/transfer': 'bearer',
    'PATCH:/v1/workspaces/{workspace_id}/services/{service_id}/action': 'bearer',
    'POST:/v1/workspaces/{workspace_id}/connections/{connection_id}/messages-templates': 'bearer',
    'POST:/v1/workspaces/{workspace_id}/services/{service_id}/messages-templates': 'bearer',
    'POST:/v1/workspaces/{workspace_id}/services/batch': 'bearer',
    'POST:/v1/workspaces/{workspace_id}/persons/batch': 'bearer',
    'POST:/v1/workspaces/{workspace_id}/import': 'bearer',
    'POST:/v2/workspaces/{workspace_id}/campaigns': 'bearer',
    'POST:/v2/workspaces/{workspace_id}/campaigns/sheet': 'bearer',
};
