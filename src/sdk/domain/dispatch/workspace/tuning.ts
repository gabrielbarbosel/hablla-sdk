/**
 * Every tunable number of the workspace dispatch, in one registry: its default, its bounds
 * and its unit. The app passes overrides from its typed config — never environment
 * variables — and renders its settings screen from {@link DISPATCH_TUNING_SPEC}, so the
 * bounds it shows are the bounds {@link resolveDispatchTuning} enforces. A value out of
 * bounds fails here instead of being silently corrected.
 */

import type { WavePacing } from '../../../core/call-executor';
import type { DispatchJob } from './types';
import { wavePausesMs } from '../../../core/call-executor';
import { LARGEST_STEP_CALLS } from './constants';

/** What a tunable counts, so the app can label and convert it. */
export type TuningUnit = 'count' | 'ms' | 'calls' | 'pages' | 'persons' | 'contacts' | 'characters';

/** One tunable: its default and the inclusive integer range it must stay in. */
export interface TuningBound {
    readonly default: number;
    readonly min: number;
    readonly max: number;
    readonly unit: TuningUnit;
}

/** The dispatch's tunables, each with the reason for its default and its bounds. */
export const DISPATCH_TUNING_SPEC = {
    /**
     * Calls sent together in one wave (one `fetchAll` in Apps Script). Kept low by default so
     * the gateway sees a trickle instead of bursts; the ceiling is the batch the GAS
     * `getAll` already sends per `fetchAll`.
     */
    waveConcurrency: { default: 8, min: 1, max: 100, unit: 'calls' },
    /**
     * Pause between two consecutive waves of one call batch, never after the last, so the
     * gateway never sees the waves back to back. Every pause comes out of the execution
     * window: a round only starts when its pauses fit beside the reserve, and the resolver
     * refuses a tuning whose largest round could never fit.
     */
    wavePauseMs: { default: 250, min: 0, max: 10_000, unit: 'ms' },
    /**
     * Contacts per block in `resolving` (at most ~200 GETs per block at the default). The
     * ceiling, twice the default, keeps a round of the block inside a minute of reserve.
     */
    lookupChunkSize: { default: 50, min: 1, max: 100, unit: 'contacts' },
    /**
     * Contacts per block in `materializing` (at most ~350 calls per block at the default:
     * send-time lookup plus writes). The ceiling, twice the default, keeps a round of the
     * block inside a minute of reserve.
     */
    writeChunkSize: { default: 50, min: 1, max: 100, unit: 'contacts' },
    /**
     * Attempts per read or write before the contact, the exclusion read or the campaign read
     * fails. At least one; past ten an outage only burns quota on a call that keeps failing.
     */
    maxCallAttempts: { default: 3, min: 1, max: 10, unit: 'count' },
    /**
     * `createPerson` sends per contact: the create is re-sent only after a reconciliation
     * found nothing. Capped at 3 because every re-send of a create whose first response was
     * lost risks a duplicate person.
     */
    maxCreateSends: { default: 2, min: 1, max: 3, unit: 'count' },
    /**
     * Wait before retrying a 5xx or a transport failure, which is never retried in the same
     * round. The floor keeps a retry out of the round that failed.
     */
    callRetryDelayMs: { default: 60_000, min: 1_000, max: 600_000, unit: 'ms' },
    /**
     * Wait before reconciling a non-idempotent write whose outcome is unknown. Below 30 s a
     * write still in flight at Hablla may be read as absent and sent again.
     */
    reconciliationDelayMs: { default: 60_000, min: 30_000, max: 600_000, unit: 'ms' },
    /**
     * Wait before reading a created campaign back. Hablla answers the creation before
     * resolving the audience, so the 201 body reports `quantity: 0` and only a later read
     * carries the quantity the dispatch checks; a read that comes too early is retried.
     */
    campaignFanoutDelayMs: { default: 60_000, min: 10_000, max: 600_000, unit: 'ms' },
    /** Cooldown after a 429. The gateway says "wait one minute" and carries no Retry-After, so one minute is the floor. */
    throttleCooldownMs: { default: 60_000, min: 60_000, max: 600_000, unit: 'ms' },
    /** Cooldown after a wave lost to the network, so an outage does not burn attempts on immediate rounds. */
    transportCooldownMs: { default: 60_000, min: 5_000, max: 600_000, unit: 'ms' },
    /**
     * Consecutive rounds that may come back interrupted before the interruptions are read as
     * transport failures. An interrupted wave consumes no attempt, so a call that always
     * breaks its wave (in Apps Script `fetchAll` throws for the whole wave) would otherwise
     * be retried every cooldown forever. Past this many rounds the contacts spend attempts,
     * which also means an outage longer than these rounds plus `maxCallAttempts` cooldowns
     * fails those contacts instead of waiting. Zero spends attempts from the first one.
     */
    interruptedRoundsBeforeAttempt: { default: 5, min: 0, max: 20, unit: 'count' },
    /** Interval between audience counts (probes 03 and 04); the floor spares the Bearer token a count per second. */
    audiencePollIntervalMs: { default: 5_000, min: 1_000, max: 60_000, unit: 'ms' },
    /**
     * How long the audience count may take to match. The count answers 500 for ~20-30 s
     * after the segmentation is created, so one minute is the floor; the default leaves
     * slack for large audiences.
     */
    audienceReadyTimeoutMs: { default: 180_000, min: 60_000, max: 1_800_000, unit: 'ms' },
    /**
     * How long the campaign waits after the last contact write when the template reads person
     * fields. Hablla renders the message from a copy of the person that lags the write, so a
     * campaign created right after the values were written sends the raw `{{…}}`. Measured
     * live (probes 11, 21, 22): written ~1 s before, raw token; 60 s before, resolved. Every
     * read the API offers shows the value after 0.15 s, so there is no signal to poll: 60 s
     * is the floor that was proven, and the default is twice that.
     */
    variableSettleMs: { default: 120_000, min: 60_000, max: 600_000, unit: 'ms' },
    /**
     * Time a block, or a round inside a block, needs left before the deadline to start. It
     * must cover the calls of the slowest round; the round's wave pauses are added on top,
     * and both together are checked to stay below `executionBudgetMs`.
     */
    chunkTimeReserveMs: { default: 60_000, min: 10_000, max: 300_000, unit: 'ms' },
    /**
     * How long a preview reading stands in for the send-time one — the contact lookup and the
     * exclusion by filter alike. Zero always reads again at the send; past an hour the
     * reading is too old to vouch for who may receive the message.
     */
    previewReuseMs: { default: 600_000, min: 0, max: 3_600_000, unit: 'ms' },
    /**
     * Page size of the person lookup by phone (and of its reconciliation). One page is all
     * that is read, so the floor keeps room for the near-matches the search returns besides
     * the holders of the phone; 50 is the largest size verified live.
     */
    personLookupPageLimit: { default: 50, min: 10, max: 50, unit: 'persons' },
    /**
     * Page size of the attendance lookup; items are classified by their own status, not by
     * the filter, so one page must hold the open ones among the rest. 50 is the largest size
     * verified live.
     */
    attendanceLookupPageLimit: { default: 50, min: 10, max: 50, unit: 'count' },
    /** Page size of the segmentation-item lookup by person, read as one page; 50 is the largest size verified live. */
    segmentationItemLookupPageLimit: { default: 50, min: 10, max: 50, unit: 'count' },
    /** Page size of the campaign lookup by name, read as one page; 50 is the largest size verified live. */
    campaignLookupPageLimit: { default: 50, min: 10, max: 50, unit: 'count' },
    /**
     * Page size of the user roster and of the custom-field catalog, read to the last page,
     * so a smaller page only costs more calls; 50 is the largest size verified live.
     */
    catalogPageLimit: { default: 50, min: 1, max: 50, unit: 'count' },
    /** Persons per page of the exclusion listing; the report route caps `limit` at 1000 (probe 07). */
    exclusionPageLimit: { default: 1_000, min: 1, max: 1_000, unit: 'persons' },
    /**
     * Pages of excluded persons one exclusion run may read, the last one short: the default
     * covers up to 49 999 excluded persons at the default page size. Each page costs one
     * Bearer call of ~8-10 s and every run reads them again, which is why the ceiling exists
     * at all: a filter whose universe is larger fails loud instead of being truncated.
     */
    maxExclusionPages: { default: 50, min: 1, max: 200, unit: 'pages' },
    /**
     * HTTP calls one dispatch may be estimated to need; in Apps Script, the account's daily
     * UrlFetch quota. The default and the ceiling are the quota of a Google Workspace account.
     */
    dailyCallQuota: { default: 100_000, min: 1, max: 100_000, unit: 'calls' },
    /**
     * Work time of one execution, from its first line to the deadline no block starts past.
     * Apps Script kills an execution at 360 s, so the ceiling leaves 30 s to persist the job
     * and release its lease.
     */
    executionBudgetMs: { default: 300_000, min: 60_000, max: 330_000, unit: 'ms' },
    /** Longest failure detail kept on a contact or a job, so a verbose error body does not swell the stored rows. */
    failureDetailMaxLength: { default: 300, min: 50, max: 5_000, unit: 'characters' },
} as const satisfies Record<string, TuningBound>;

/** Name of one tunable. */
export type DispatchTuningKey = keyof typeof DISPATCH_TUNING_SPEC;

/** Every tunable with a value, as one dispatch (and every job it plans) runs with. */
export type DispatchTuning = { readonly [K in DispatchTuningKey]: number };

/** The tunables of the spec, in its order. */
const TUNING_KEYS = Object.keys(DISPATCH_TUNING_SPEC) as DispatchTuningKey[];

/** Every tunable at its default. */
export const DEFAULT_DISPATCH_TUNING: DispatchTuning = Object.freeze(
    Object.fromEntries(TUNING_KEYS.map((key) => [key, DISPATCH_TUNING_SPEC[key].default])) as Record<DispatchTuningKey, number>,
);

/**
 * The tuning with every override applied over the defaults; a key left out or `undefined`
 * keeps its default.
 *
 * @throws TypeError when the overrides are not an object; RangeError naming every unknown
 *   key, every value that is not an integer inside its bounds, and a largest round that does
 *   not fit in the execution budget — all at once, so the app can show every mistake of a
 *   settings form together.
 */
export function resolveDispatchTuning(overrides: Partial<DispatchTuning>): DispatchTuning {
    if (typeof overrides !== 'object' || overrides === null) {
        throw new TypeError(`DispatchTuning: overrides must be an object, got ${String(overrides)}`);
    }

    const tuning: DispatchTuning = { ...DEFAULT_DISPATCH_TUNING, ...definedValuesOf(overrides) };
    const valueProblems = [...unknownKeyProblems(overrides), ...TUNING_KEYS.flatMap((key) => boundProblems(key, tuning[key]))];
    const problems = valueProblems.length > 0 ? valueProblems : relationProblems(tuning);

    if (problems.length > 0) {
        throw new RangeError(`DispatchTuning: ${problems.join('; ')}`);
    }

    return Object.freeze(tuning);
}

/**
 * The tuning a job runs with: the one it was planned with, or the defaults for a job
 * planned before v0.7.0, which stored none.
 */
export function tuningOf(job: Pick<DispatchJob, 'tuning'>): DispatchTuning {
    return job.tuning ?? DEFAULT_DISPATCH_TUNING;
}

/** The wave pacing of a tuning, as a `CallExecutor` takes it. */
export function wavePacingOf(tuning: DispatchTuning): WavePacing {
    return { concurrency: tuning.waveConcurrency, pauseMs: tuning.wavePauseMs };
}

/** The overrides without the keys whose value is `undefined`. */
function definedValuesOf(overrides: Partial<DispatchTuning>): Partial<DispatchTuning> {
    return Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined));
}

/** One problem per key the spec does not know. */
function unknownKeyProblems(overrides: Partial<DispatchTuning>): string[] {
    return Object.keys(overrides)
        .filter((key) => !(TUNING_KEYS as readonly string[]).includes(key))
        .map((key) => `${key} is not a dispatch tunable`);
}

/** The problem of a value outside its key's bounds, or none. */
function boundProblems(key: DispatchTuningKey, value: unknown): string[] {
    const { min, max } = DISPATCH_TUNING_SPEC[key];

    return Number.isInteger(value) && (value as number) >= min && (value as number) <= max
        ? []
        : [`${key} must be an integer from ${min} to ${max}, got ${String(value)}`];
}

/**
 * Problems between tunables that are each inside their own bounds: a round only starts
 * when the reserve and its wave pauses fit before the deadline, so the largest round has to
 * fit in the execution budget, or the job would yield forever without sending a call.
 */
function relationProblems(tuning: DispatchTuning): string[] {
    const largestRoundCalls = Math.max(tuning.lookupChunkSize, tuning.writeChunkSize) * LARGEST_STEP_CALLS;
    const largestRoundMs = tuning.chunkTimeReserveMs + wavePausesMs(largestRoundCalls, wavePacingOf(tuning));

    return largestRoundMs < tuning.executionBudgetMs
        ? []
        : [`chunkTimeReserveMs plus the wave pauses of the largest round (${largestRoundMs} ms) must be below executionBudgetMs (${tuning.executionBudgetMs}), or no round ever starts`];
}
