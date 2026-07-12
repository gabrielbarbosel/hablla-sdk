/**
 * Generator stage: GUARDS / CANARY (roadmap A11).
 *
 * Cheap invariant checks run AFTER extract+emit and BEFORE promotion. Their job
 * is to catch a catastrophically bad extraction — a bundle whose shape changed
 * under us, a failed AST parse, a mangled alias map — and ABORT the release
 * rather than promote an empty / broken SDK over the known-good resources.
 *
 * When any guard trips the run is classified `failure`: the current
 * `src/sdk/resources` are kept untouched and the report carries the reasons so
 * an operator (or the upstream CI job) can triage. This is the "fail HIGH, keep
 * the previous spec" durability rule that makes the codegen safe to run on cron
 * with no human in the loop.
 */

/** The raw metrics the guards judge, gathered by the extract + emit stages. */
export interface GuardMetrics {
    /** Whether the bundle AST parse recovered any request functions at all. */
    parseOk: boolean;
    /** Total operations in the resolved spec. */
    operationCount: number;
    /** Operations whose request body is multipart/form-data (`*WithFile` uploads). */
    multipartCount: number;
    /** Whether the `APIClient` class was found in the bundle source. */
    apiClientFound: boolean;
    /** How many resolved routes are workspace-scoped (carry `{workspace_id}`). */
    workspaceAliasCount: number;
}

/** Tunable trip points for {@link evaluateGuards}. */
export interface GuardThresholds {
    /** Abort if the spec carries fewer operations than this. */
    minOperations: number;
    /** The number of multipart uploads a healthy bundle exposes (documentation only). */
    expectedMultipart: number;
    /** Abort if fewer than this many routes resolved the `{workspace}` alias. */
    minWorkspaceAlias: number;
}

/**
 * Defaults calibrated against a known-good extraction (725 ops, 7 multipart
 * uploads, 490 workspace-scoped routes). The thresholds sit far enough below
 * those figures to tolerate normal API growth/shrinkage while still catching a
 * collapse (an empty or half-parsed bundle).
 */
export const DEFAULT_GUARD_THRESHOLDS: GuardThresholds = {
    minOperations: 500,
    expectedMultipart: 7,
    minWorkspaceAlias: 100,
};

/** Verdict of the guard stage. */
export interface GuardResult {
    /** True when every invariant held (safe to promote). */
    ok: boolean;
    /** The inverse of {@link ok} — surfaced verbatim in the report's `guards.anomaly`. */
    anomaly: boolean;
    /** Human-readable reason per tripped guard (empty when `ok`). */
    reasons: string[];
    /** Echo of {@link GuardMetrics.parseOk} for the report. */
    parseOk: boolean;
    /** Echo of the recovered multipart-upload count for the report. */
    uploads: number;
}

/**
 * Evaluate the canary invariants against the extraction metrics.
 * @param metrics The gathered extraction metrics.
 * @param thresholds Trip points (defaults to {@link DEFAULT_GUARD_THRESHOLDS}).
 * @returns The guard verdict; `ok: false` means DO NOT promote.
 */
export function evaluateGuards(
    metrics: GuardMetrics,
    thresholds: GuardThresholds = DEFAULT_GUARD_THRESHOLDS,
): GuardResult {
    const reasons: string[] = [];

    if (!metrics.parseOk) {
        reasons.push('bundle parse recovered no request functions (parse failed)');
    }
    if (metrics.operationCount < thresholds.minOperations) {
        reasons.push(`operation count ${metrics.operationCount} < ${thresholds.minOperations}`);
    }
    if (metrics.multipartCount === 0) {
        reasons.push(`no multipart uploads recovered (expected ${thresholds.expectedMultipart})`);
    }
    if (!metrics.apiClientFound) {
        reasons.push('APIClient class not found in bundle source');
    }
    if (metrics.workspaceAliasCount < thresholds.minWorkspaceAlias) {
        reasons.push(`{workspace} alias resolved only ${metrics.workspaceAliasCount} time(s) (< ${thresholds.minWorkspaceAlias})`);
    }

    const ok = reasons.length === 0;
    return {
        ok,
        anomaly: !ok,
        reasons,
        parseOk: metrics.parseOk,
        uploads: metrics.multipartCount,
    };
}
