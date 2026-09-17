/**
 * The limits of a dispatch and their defaults. They are typed configuration values the app
 * passes in — never environment variables — and each one has a documented default; a value
 * out of range fails here instead of being silently corrected.
 */

import type { WorkspaceDispatchLimits } from './types';
import { EXCLUSION_PAGE_LIMIT } from './constants';

/** Daily `UrlFetchApp` calls of a Google Workspace account, which the script this dispatch runs in belongs to. */
export const GOOGLE_WORKSPACE_DAILY_CALL_QUOTA = 100_000;

/**
 * Pages of excluded persons one exclusion run may read, at {@link EXCLUSION_PAGE_LIMIT}
 * persons each, the last one short: the default covers up to 49 999 excluded persons, and
 * 50 000 already ask for 51 pages. Each page costs one Bearer call of ~8-10 s and every run
 * reads them again, which is why the ceiling exists at all: a filter whose universe is
 * larger fails loud instead of being truncated, and the app raises this value when an
 * exclusion really covers more people than that.
 */
export const DEFAULT_MAX_EXCLUSION_PAGES = 50;

/** The limits of a dispatch with every default already applied. */
export type DispatchLimits = Required<WorkspaceDispatchLimits>;

/**
 * The configured limits with the defaults applied.
 *
 * @throws RangeError when a limit is not an integer >= 1.
 */
export function resolveDispatchLimits(limits: WorkspaceDispatchLimits = {}): DispatchLimits {
    return {
        dailyCallQuota: requireCount('dailyCallQuota', limits.dailyCallQuota ?? GOOGLE_WORKSPACE_DAILY_CALL_QUOTA),
        maxExclusionPages: requireCount('maxExclusionPages', limits.maxExclusionPages ?? DEFAULT_MAX_EXCLUSION_PAGES),
    };
}

/**
 * A configured count.
 *
 * @throws RangeError when the value is not an integer >= 1.
 */
function requireCount(limit: string, value: number): number {
    if (!Number.isInteger(value) || value < 1) {
        throw new RangeError(`WorkspaceDispatch: ${limit} must be an integer >= 1, got ${value}`);
    }

    return value;
}
