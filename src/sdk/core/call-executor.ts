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
 * Executes independent calls concurrently in waves. Contract: never retries, never
 * sleeps, never changes a call's strategy, never records strategies. After a wave
 * containing a 429, or a wave that failed as a whole, it stops and reports the
 * remaining calls as `unsent`. Results align with `calls`.
 */
export interface CallExecutor {
    executeAll(calls: readonly HttpCall[]): Promise<CallResult[]>;
}

/** The only part of {@link HabllaAuth} an executor may use: header values, never strategy resolution. */
export type CallAuthorization = Pick<HabllaAuth, 'authorization'>;

/** Where calls are sent and how many run at once. */
export interface CallExecutorOptions {
    baseUrl: string;
    workspaceId: string;
    /** Calls per wave; integer >= 1. */
    concurrency: number;
}

/** Status the gateway answers when the token's rate limit is exhausted. */
export const TOO_MANY_REQUESTS_STATUS = 429;

/**
 * Sends one wave and returns its results aligned with the wave. Throws when the wave
 * failed as a whole (nothing is known about any of its calls).
 */
export type WaveSender = (wave: readonly HttpCall[]) => Promise<CallResult[]>;

/**
 * Runs `calls` in consecutive waves of `concurrency`, stopping after a wave that holds a
 * `throttled` result or that failed as a whole; every call after the stop is `unsent`.
 * Shared by every {@link CallExecutor} so the wave contract has one implementation.
 */
export async function executeInWaves(calls: readonly HttpCall[], concurrency: number, sendWave: WaveSender): Promise<CallResult[]> {
    const results: CallResult[] = [];

    for (let start = 0; start < calls.length; start += concurrency) {
        const wave = calls.slice(start, start + concurrency);
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
export function urlOfCall(call: HttpCall, options: Pick<CallExecutorOptions, 'baseUrl' | 'workspaceId'>): string {
    return buildRequestUrl({
        baseUrl: options.baseUrl,
        workspaceId: options.workspaceId,
        rawPath: call.rawPath,
        pathParams: call.pathParams,
        query: call.query,
    });
}

/**
 * Validates executor options at construction.
 *
 * @throws RangeError when `concurrency` is not an integer >= 1.
 */
export function assertValidExecutorOptions(options: CallExecutorOptions): void {
    if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
        throw new RangeError(`CallExecutor: concurrency must be an integer >= 1, got ${options.concurrency}`);
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
    ) {
        assertValidExecutorOptions(options);
    }

    async executeAll(calls: readonly HttpCall[]): Promise<CallResult[]> {
        if (calls.length === 0) {
            return [];
        }

        const headers = await authorizationsFor(calls, this.auth);

        return executeInWaves(calls, this.options.concurrency, (wave) => this.sendWave(wave, headers));
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

    /** Sends one call with its pinned strategy's header. */
    private async send(call: HttpCall, headers: ReadonlyMap<AuthStrategy, string>): Promise<CallResult> {
        const requestHeaders: Record<string, string> = {
            Accept: 'application/json',
            Authorization: headers.get(call.strategy)!,
        };

        if (call.body !== undefined) {
            requestHeaders['Content-Type'] = 'application/json';
        }

        const response = await this.transport.send({
            method: call.method,
            url: urlOfCall(call, this.options),
            headers: requestHeaders,
            body: call.body,
        });

        return resultOfResponse(response.status, response.data);
    }
}
