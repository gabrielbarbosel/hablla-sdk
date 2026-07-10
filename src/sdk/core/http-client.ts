import type { HttpTransport, HttpResponse, Paged } from './types';
import type { HabllaAuth } from './auth';
import type { AuthStrategy } from './strategy';
import { serializeQuery } from './query';
import { HabllaApiError, type TraceEntry } from './errors';
import { paginate, type PaginateOptions, type PaginateResult } from './pagination';

const TRACE_LIMIT = 25;

/** Shared, runtime-global debug object. In the RPO sandbox a code node can read
 *  `globalThis.$habllaDebug.trace` to see the recent calls; it survives for the
 *  duration of the execution (the isolate is per-run). */
interface HabllaDebugGlobal {
    $habllaDebug?: { trace: TraceEntry[] };
}

export interface RequestOptions {
    /** Path parameter values. `workspace` is filled automatically. */
    path?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: unknown;
    headers?: Record<string, string>;
    contentType?: string;
}

export interface HttpClientConfig {
    workspaceId: string;
    baseUrl: string;
    /** When true, keeps a call trace and enriches errors with request context. */
    debug?: boolean;
}

/** True for transport errors with no HTTP status (timeout, reset, socket hang up). */
function isNetworkError(err: any): boolean {
    const msg = String(err?.message ?? '');
    return err?.code === 'ECONNABORTED' || /timeout|ETIMEDOUT|ECONNRESET|socket hang up|network/i.test(msg);
}

/**
 * SDK HTTP client. Resolves the path template, serializes the query and sends via
 * the injected transport. Auth is workspace-first per endpoint (see
 * {@link HabllaHttpClient._requestOnce}). Throws {@link HabllaApiError} on non-2xx.
 */
export class HabllaHttpClient {
    private readonly debug: boolean;

    constructor(
        private readonly transport: HttpTransport,
        private readonly auth: HabllaAuth,
        private readonly config: HttpClientConfig,
    ) {
        this.debug = config.debug ?? false;
    }

    /** Appends to the runtime-global debug trace (ring buffer). No-op unless debug. */
    private record(entry: TraceEntry): TraceEntry[] {
        const g = globalThis as unknown as HabllaDebugGlobal;
        const dbg = (g.$habllaDebug ??= { trace: [] });
        dbg.trace.push(entry);
        if (dbg.trace.length > TRACE_LIMIT) dbg.trace.shift();
        return dbg.trace;
    }

    private resolvePath(rawPath: string, params: Record<string, unknown> = {}): string {
        return rawPath.replace(/{([^}]+)}/g, (match, token: string) => {
            const key = token.includes('.') ? token.slice(token.lastIndexOf('.') + 1) : token;
            const val = params[key] ?? (key.includes('workspace') ? this.config.workspaceId : null);
            return val != null ? encodeURIComponent(String(val)) : match;
        });
    }

    private async send<T>(method: string, url: string, opts: RequestOptions, strategy: AuthStrategy): Promise<HttpResponse<T>> {
        return this.transport.send<T>({
            method,
            url,
            headers: {
                Accept: 'application/json',
                'Content-Type': opts.contentType ?? 'application/json',
                Authorization: await this.auth.authorization(strategy),
                ...opts.headers,
            },
            body: opts.body,
        });
    }

    /**
     * Retries transient failures with exponential backoff and jitter. A 429 (rate
     * limit) is always safe to retry — the request was rejected, not processed. A
     * 5xx or a network/timeout error is only retried for idempotent methods (GET):
     * on a POST/PUT/PATCH/DELETE the request may have been applied before the
     * response was lost, so retrying could duplicate a send or a create.
     */
    async request<T>(method: string, rawPath: string, opts: RequestOptions = {}): Promise<T> {
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
        const idempotent = method === 'GET' || method === 'HEAD';
        for (let attemptNum = 0; ; attemptNum++) {
            try {
                return await this._requestOnce<T>(method, rawPath, opts);
            } catch (err: any) {
                const status = err?.status ?? err?.response?.status;
                const transient = status === 429 || (idempotent && ((status != null && status >= 500) || isNetworkError(err)));
                if (transient && attemptNum < 6) {
                    await sleep(Math.min(1000 * Math.pow(2, attemptNum), 20000) + (Date.now() % 400));
                    continue;
                }
                throw err;
            }
        }
    }

    /**
     * Sends once with the endpoint's resolved strategy. The strategy is seeded from
     * the shared cache and defaults to workspace-first. On a genuine auth rejection
     * (401/403) the request was not processed, so the other strategy is tried and
     * the working one is recorded — symmetric, so a wrong seed self-corrects (a
     * Bearer-seeded endpoint that a token cannot use falls back to workspace, and
     * vice-versa). Any other workspace failure is retried once on Bearer to satisfy
     * the request but is not recorded, so a transient error never rewrites the cache.
     * A non-auth failure on a Bearer endpoint is not retried (avoids a duplicate
     * POST when the request may already have been applied).
     */
    private async _requestOnce<T>(method: string, rawPath: string, opts: RequestOptions = {}): Promise<T> {
        const url = this.config.baseUrl + this.resolvePath(rawPath, opts.path) + serializeQuery(opts.query);
        const cacheKey = `${method}:${rawPath}`;
        const primary = await this.auth.resolveStrategy(cacheKey);

        let res = await this.send<T>(method, url, opts, primary);
        if (res.status < 400) {
            await this.auth.recordStrategy(cacheKey, primary);
        } else if (res.status === 401 || res.status === 403) {
            const alternate: AuthStrategy = primary === 'workspace' ? 'bearer' : 'workspace';
            res = await this.send<T>(method, url, opts, alternate);
            if (res.status < 400) await this.auth.recordStrategy(cacheKey, alternate);
        } else if (primary === 'workspace') {
            res = await this.send<T>(method, url, opts, 'bearer');
        }

        let trace: TraceEntry[] | undefined;
        if (this.debug) trace = this.record({ method, path: rawPath, status: res.status });

        if (res.status >= 300) {
            throw new HabllaApiError(
                res,
                this.debug ? { method, path: rawPath, requestBody: method === 'GET' ? undefined : opts.body, trace } : undefined,
            );
        }
        return res.data;
    }

    get<T>(path: string, opts?: RequestOptions): Promise<T> {
        return this.request<T>('GET', path, opts);
    }
    post<T>(path: string, opts?: RequestOptions): Promise<T> {
        return this.request<T>('POST', path, opts);
    }
    put<T>(path: string, opts?: RequestOptions): Promise<T> {
        return this.request<T>('PUT', path, opts);
    }
    patch<T>(path: string, opts?: RequestOptions): Promise<T> {
        return this.request<T>('PATCH', path, opts);
    }
    delete<T>(path: string, opts?: RequestOptions): Promise<T> {
        return this.request<T>('DELETE', path, opts);
    }

    /** Fetches every page of a paginated endpoint. See {@link paginate}. */
    paginate<T>(fetchPage: (page: number, limit: number) => Promise<Paged<T>>, opts?: PaginateOptions): Promise<PaginateResult<T>> {
        return paginate(fetchPage, opts);
    }
}
