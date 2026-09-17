import { describe, it, expect } from 'vitest';
import { DEFAULT_MAX_EXCLUSION_PAGES, GOOGLE_WORKSPACE_DAILY_CALL_QUOTA, resolveDispatchLimits } from './limits';

describe('resolveDispatchLimits', () => {
    it('defaults the quota to a Google Workspace account and the exclusion pages to the documented ceiling', () => {
        expect(GOOGLE_WORKSPACE_DAILY_CALL_QUOTA).toBe(100_000);
        expect(resolveDispatchLimits()).toEqual({ dailyCallQuota: GOOGLE_WORKSPACE_DAILY_CALL_QUOTA, maxExclusionPages: DEFAULT_MAX_EXCLUSION_PAGES });
        expect(resolveDispatchLimits({})).toEqual(resolveDispatchLimits());
    });

    it('keeps the configured values', () => {
        expect(resolveDispatchLimits({ dailyCallQuota: 20_000, maxExclusionPages: 3 })).toEqual({ dailyCallQuota: 20_000, maxExclusionPages: 3 });
    });

    it('refuses a limit that is not an integer >= 1', () => {
        expect(() => resolveDispatchLimits({ dailyCallQuota: 0 })).toThrow(RangeError);
        expect(() => resolveDispatchLimits({ dailyCallQuota: 1.5 })).toThrow(RangeError);
        expect(() => resolveDispatchLimits({ maxExclusionPages: 0 })).toThrow(/maxExclusionPages/);
    });
});
