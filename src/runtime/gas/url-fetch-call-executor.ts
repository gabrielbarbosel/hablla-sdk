import type { CallAuthorization, CallExecutor, CallExecutorOptions, CallResult, HttpCall } from '../../sdk/core/call-executor';
import type { AuthStrategy } from '../../sdk/core/strategy';
import { assertValidExecutorOptions, authorizationsFor, executeInWaves, resultOfResponse, urlOfCall } from '../../sdk/core/call-executor';

/** Apps Script bindings the executor uses. */
declare const UrlFetchApp: {
    fetchAll(requests: Array<Record<string, unknown>>): Array<{ getResponseCode(): number; getContentText(): string }>;
};

/**
 * {@link CallExecutor} over `UrlFetchApp.fetchAll`, run inside `runSync`. Each wave is one
 * `fetchAll`; a thrown `fetchAll` interrupts the wave and stops the batch. It never
 * sleeps, never retries and never switches tokens.
 */
export class UrlFetchCallExecutor implements CallExecutor {
    constructor(private readonly auth: CallAuthorization, private readonly options: CallExecutorOptions) {
        assertValidExecutorOptions(options);
    }

    async executeAll(calls: readonly HttpCall[]): Promise<CallResult[]> {
        if (calls.length === 0) {
            return [];
        }

        const headers = await authorizationsFor(calls, this.auth);

        return executeInWaves(calls, this.options.concurrency, async (wave) => UrlFetchApp
            .fetchAll(wave.map((call) => this.fetchRequestOf(call, headers)))
            .map((response) => resultOfResponse(response.getResponseCode(), parseBody(response.getContentText()))));
    }

    /** The `fetchAll` request of a call. */
    private fetchRequestOf(call: HttpCall, headers: ReadonlyMap<AuthStrategy, string>): Record<string, unknown> {
        const request: Record<string, unknown> = {
            url: urlOfCall(call, this.options),
            method: call.method.toLowerCase(),
            headers: { Accept: 'application/json', Authorization: headers.get(call.strategy) },
            muteHttpExceptions: true,
        };

        if (call.body !== undefined) {
            request.contentType = 'application/json';
            request.payload = JSON.stringify(call.body);
        }

        return request;
    }
}

/** A response body as JSON when it parses, as text otherwise, `null` when empty. */
function parseBody(text: string): unknown {
    if (text === '') {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}
