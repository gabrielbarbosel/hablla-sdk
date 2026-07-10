import type { HttpResponse } from './types';

/** One entry in the debug call trace (see {@link HabllaHttpClient}). */
export interface TraceEntry {
    method: string;
    path: string;
    status: number;
}

/** Context attached to an error when debug mode is on. */
export interface ErrorDebugContext {
    method: string;
    path: string;
    requestBody?: unknown;
    trace?: TraceEntry[];
}

function safeStringify(value: unknown, max: number): string {
    try {
        return JSON.stringify(value).slice(0, max);
    } catch {
        return String(value).slice(0, max);
    }
}

/**
 * Error raised for a non-2xx Hablla API response. When a debug context is passed
 * (debug mode on), the message is enriched with the failing request and a compact
 * trace of the recent calls, so it stays useful even inside the RPO sandbox where
 * the platform only surfaces `error.message`.
 */
export class HabllaApiError extends Error {
    readonly status: number;
    readonly data: unknown;
    readonly debug?: ErrorDebugContext;

    constructor(res: HttpResponse, debug?: ErrorDebugContext) {
        let message = `Hablla API ${res.status}: ${safeStringify(res.data, 200)}`;
        if (debug) {
            message += ` | req: ${debug.method} ${debug.path}`;
            if (debug.requestBody !== undefined) {
                message += ` body=${safeStringify(debug.requestBody, 300)}`;
            }
            if (debug.trace?.length) {
                const trace = debug.trace.map((t) => `${t.method} ${t.path} -> ${t.status}`).join(' ; ');
                message += ` | trace: ${trace}`;
            }
        }
        super(message);
        this.name = 'HabllaApiError';
        this.status = res.status;
        this.data = res.data;
        this.debug = debug;
    }
}
