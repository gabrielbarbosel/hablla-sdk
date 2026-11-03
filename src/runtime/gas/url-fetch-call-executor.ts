import type { CallAuthorization, CallExecutor, CallExecutorOptions, CallResult, HttpCall, WavePacing } from '../../sdk/core/call-executor';
import type { AuthStrategy } from '../../sdk/core/strategy';
import { authorizationsFor, executeInWaves, resultOfResponse, wireRequestOf } from '../../sdk/core/call-executor';

/** Apps Script bindings the executor uses. */
declare const UrlFetchApp: {
    fetchAll(requests: Array<Record<string, unknown>>): Array<{ getResponseCode(): number; getContentText(): string }>;
};

/**
 * {@link CallExecutor} over `UrlFetchApp.fetchAll`, run inside `runSync`. Each wave is one
 * `fetchAll`; a thrown `fetchAll` interrupts the wave and stops the batch. It waits only
 * through the injected pause between waves (`Utilities.sleep` in the runtime), never
 * retries and never switches tokens.
 */
export class UrlFetchCallExecutor implements CallExecutor {
    constructor(private readonly auth: CallAuthorization, private readonly options: CallExecutorOptions) {}

    async executeAll(calls: readonly HttpCall[], pacing: WavePacing): Promise<CallResult[]> {
        if (calls.length === 0) {
            return [];
        }

        const headers = await authorizationsFor(calls, this.auth);
        const sendWave = async (wave: readonly HttpCall[]): Promise<CallResult[]> => UrlFetchApp
            .fetchAll(wave.map((call) => this.fetchRequestOf(call, headers)))
            .map((response) => resultOfResponse(response.getResponseCode(), parseBody(response.getContentText())));

        return executeInWaves(calls, pacing, sendWave, this.options.pause);
    }

    /** The `fetchAll` request of a call, with the content type and the body as `fetchAll` takes them. */
    private fetchRequestOf(call: HttpCall, headers: ReadonlyMap<AuthStrategy, string>): Record<string, unknown> {
        const wire = wireRequestOf(call, headers, this.options);
        const request: Record<string, unknown> = {
            url: wire.url,
            method: wire.method.toLowerCase(),
            headers: wire.headers,
            muteHttpExceptions: true,
        };

        if (wire.contentType !== undefined) {
            request.contentType = wire.contentType;
            request.payload = JSON.stringify(wire.body);
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
