import type { HttpTransport } from './types';
import type { HabllaAuth } from './auth';
import type { AuthStrategy } from './strategy';
import { buildRequestUrl } from './url';

/** One HTTP call described as data, with its auth strategy pinned. */
export interface HttpCall {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    /** Path template, e.g. `/v1/workspaces/{workspace_id}/persons/{person_id}`. */
    rawPath: string;
    pathParams?: Readonly<Record<string, string>>;
    query?: Readonly<Record<string, unknown>>;
    body?: unknown;
    strategy: AuthStrategy;
}

/**
 * Outcome of one call in a batch.
 * - `completed`: a response arrived (any status except 429).
 * - `throttled`: 429; the request was not processed.
 * - `unsent`: never sent because an earlier wave stopped the batch.
 * - `interrupted`: the whole wave failed at transport level (e.g. `fetchAll` threw); outcome unknown.
 * - `transportFailed`: this call alone failed at transport level inside a healthy wave; outcome unknown.
 */
export type CallResult =
    | { kind: 'completed'; status: number; data: unknown }
    | { kind: 'throttled' }
    | { kind: 'unsent' }
    | { kind: 'interrupted'; message: string }
    | { kind: 'transportFailed'; message: string };

/**
 * Executes independent calls concurrently in waves paced by the caller. Contract: never
 * retries, never changes a call's strategy, never records strategies, and waits only for
 * the pause between two consecutive waves — never before the first or after the last.
 * After a wave containing a 429, or a wave that failed as a whole, it stops and reports
 * the remaining calls as `unsent`. Results align with `calls`. It rejects only before any
 * call is sent (e.g. an authorization that cannot be resolved, or an invalid pacing);
 * every failure after that is reported as a result.
 */
export interface CallExecutor {
    executeAll(calls: readonly HttpCall[], pacing: WavePacing): Promise<CallResult[]>;
}

/** How a batch is split and spaced: the calls of one wave and the pause between two waves. */
export interface WavePacing {
    /** Calls per wave; integer >= 1. */
    concurrency: number;
    /** Wait between two consecutive waves; integer >= 0, where 0 sends them back to back. */
    pauseMs: number;
}

/** The wait between two waves, injected so the wave logic never touches timers. */
export type WavePause = (ms: number) => Promise<void>;

/** The only part of {@link HabllaAuth} an executor may use: header values, never strategy resolution. */
export type CallAuthorization = Pick<HabllaAuth, 'authorization'>;

/** Where calls are sent and how the executor waits between waves. */
export interface CallExecutorOptions {
    baseUrl: string;
    workspaceId: string;
    pause: WavePause;
}

/** Status the gateway answers when the token's rate limit is exhausted. */
export const TOO_MANY_REQUESTS_STATUS = 429;

/** Media type of every body the SDK sends and of every response it accepts. */
const JSON_MEDIA_TYPE = 'application/json';

/** One call ready for a transport: the wire contract of every executor. */
export interface WireRequest {
    method: HttpCall['method'];
    url: string;
    headers: Record<string, string>;
    /** Set only when the call carries a body. */
    contentType?: string;
    body?: unknown;
}

/**
 * The wire request of a call: its URL, the JSON `Accept`, the `Authorization` of its
 * pinned strategy and, only when it carries a body, the JSON content type. Shared by every
 * {@link CallExecutor} so the request contract has one implementation.
 *
 * @throws Error when no authorization was resolved for the call's strategy.
 */
export function wireRequestOf(call: HttpCall, headers: ReadonlyMap<AuthStrategy, string>, options: Pick<CallExecutorOptions, 'baseUrl' | 'workspaceId'>): WireRequest {
    const authorization = headers.get(call.strategy);

    if (authorization === undefined) {
        throw new Error(`No authorization was resolved for the ${call.strategy} strategy`);
    }

    const request: WireRequest = {
        method: call.method,
        url: urlOfCall(call, options),
        headers: { Accept: JSON_MEDIA_TYPE, Authorization: authorization },
    };

    return call.body === undefined ? request : { ...request, contentType: JSON_MEDIA_TYPE, body: call.body };
}

/**
 * Sends one wave and returns its results aligned with the wave. Throws when the wave
 * failed as a whole (nothing is known about any of its calls).
 */
export type WaveSender = (wave: readonly HttpCall[]) => Promise<CallResult[]>;

/**
 * Runs `calls` in consecutive waves of `pacing.concurrency`, pausing `pacing.pauseMs`
 * between two waves, and stopping after a wave that holds a `throttled` result or that
 * failed as a whole; every call after the stop is `unsent`. Shared by every
 * {@link CallExecutor} so the wave contract has one implementation.
 *
 * @throws RangeError when the pacing is invalid, before any call is sent.
 */
export async function executeInWaves(calls: readonly HttpCall[], pacing: WavePacing, sendWave: WaveSender, pause: WavePause): Promise<CallResult[]> {
    assertValidPacing(pacing);

    const results: CallResult[] = [];

    for (let start = 0; start < calls.length; start += pacing.concurrency) {
        if (start > 0 && pacing.pauseMs > 0) {
            await pause(pacing.pauseMs);
        }

        const wave = calls.slice(start, start + pacing.concurrency);
        const waveResults = await sendWaveOrInterrupt(wave, sendWave);

        results.push(...waveResults);

        if (waveResults.some(stopsTheBatch)) {
            break;
        }
    }

    while (results.length < calls.length) {
        results.push({ kind: 'unsent' });
    }

    return results;
}

/** Sends a wave, turning a whole-wave failure into one `interrupted` result per call. */
async function sendWaveOrInterrupt(wave: readonly HttpCall[], sendWave: WaveSender): Promise<CallResult[]> {
    try {
        return await sendWave(wave);
    } catch (error) {
        const message = errorMessageOf(error);
        return wave.map((): CallResult => ({ kind: 'interrupted', message }));
    }
}

/** True for results after which no further wave may be sent. */
function stopsTheBatch(result: CallResult): boolean {
    return result.kind === 'throttled' || result.kind === 'interrupted';
}

/** Classifies an HTTP response status into a {@link CallResult}. */
export function resultOfResponse(status: number, data: unknown): CallResult {
    if (status === TOO_MANY_REQUESTS_STATUS) {
        return { kind: 'throttled' };
    }

    return { kind: 'completed', status, data };
}

/**
 * Resolves the Authorization header once per strategy present in `calls`, so a batch
 * of workspace calls never refreshes the Bearer token.
 */
export async function authorizationsFor(calls: readonly HttpCall[], auth: CallAuthorization): Promise<ReadonlyMap<AuthStrategy, string>> {
    const headers = new Map<AuthStrategy, string>();

    for (const call of calls) {
        if (!headers.has(call.strategy)) {
            headers.set(call.strategy, await auth.authorization(call.strategy));
        }
    }

    return headers;
}

/** Absolute URL of a call. */
function urlOfCall(call: HttpCall, options: Pick<CallExecutorOptions, 'baseUrl' | 'workspaceId'>): string {
    return buildRequestUrl({
        baseUrl: options.baseUrl,
        workspaceId: options.workspaceId,
        rawPath: call.rawPath,
        pathParams: call.pathParams,
        query: call.query,
    });
}

/** Total pause a batch of `callCount` calls spends between its waves when none stops it. */
export function wavePausesMs(callCount: number, pacing: WavePacing): number {
    return Math.max(0, Math.ceil(callCount / pacing.concurrency) - 1) * pacing.pauseMs;
}

/**
 * Validates a batch's pacing.
 *
 * @throws RangeError when `concurrency` is not an integer >= 1 or `pauseMs` not an integer >= 0.
 */
function assertValidPacing(pacing: WavePacing): void {
    if (!Number.isInteger(pacing.concurrency) || pacing.concurrency < 1) {
        throw new RangeError(`CallExecutor: concurrency must be an integer >= 1, got ${pacing.concurrency}`);
    }

    if (!Number.isInteger(pacing.pauseMs) || pacing.pauseMs < 0) {
        throw new RangeError(`CallExecutor: pauseMs must be an integer >= 0, got ${pacing.pauseMs}`);
    }
}

/** Human-readable message of a thrown value. */
function errorMessageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * {@link CallExecutor} over an {@link HttpTransport} (Node, tests). Each wave sends its
 * calls with `Promise.all`; a rejected send is `transportFailed`, and a wave whose sends
 * all rejected is `interrupted` and stops the batch.
 */
export class TransportCallExecutor implements CallExecutor {
    constructor(
        private readonly transport: HttpTransport,
        private readonly auth: CallAuthorization,
        private readonly options: CallExecutorOptions,
    ) {}

    async executeAll(calls: readonly HttpCall[], pacing: WavePacing): Promise<CallResult[]> {
        if (calls.length === 0) {
            return [];
        }

        const headers = await authorizationsFor(calls, this.auth);

        return executeInWaves(calls, pacing, (wave) => this.sendWave(wave, headers), this.options.pause);
    }

    /** Sends a wave concurrently; throws when every send of the wave rejected. */
    private async sendWave(wave: readonly HttpCall[], headers: ReadonlyMap<AuthStrategy, string>): Promise<CallResult[]> {
        const settled = await Promise.allSettled(wave.map((call) => this.send(call, headers)));
        const rejections = settled.filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');

        if (rejections.length === wave.length) {
            throw rejections[0]!.reason;
        }

        return settled.map((outcome): CallResult => outcome.status === 'fulfilled'
            ? outcome.value
            : { kind: 'transportFailed', message: errorMessageOf(outcome.reason) });
    }

    /** Sends one call, with the content type as a header, the way {@link HttpTransport} takes it. */
    private async send(call: HttpCall, headers: ReadonlyMap<AuthStrategy, string>): Promise<CallResult> {
        const request = wireRequestOf(call, headers, this.options);
        const response = await this.transport.send({
            method: request.method,
            url: request.url,
            headers: request.contentType === undefined ? request.headers : { ...request.headers, 'Content-Type': request.contentType },
            body: request.body,
        });

        return resultOfResponse(response.status, response.data);
    }
}
