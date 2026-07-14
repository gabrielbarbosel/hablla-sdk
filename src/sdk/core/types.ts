/** A single file part of a {@link MultipartBody}. */
export interface MultipartFile {
    data: Uint8Array;
    filename: string;
    contentType?: string;
}

/**
 * Runtime-agnostic multipart/form-data body. Tagged with `kind` so the SDK core
 * and every transport can detect it without sniffing values. The transport owns
 * the boundary and the resulting `Content-Type` header — the SDK never sets it.
 */
export interface MultipartBody {
    readonly kind: 'multipart';
    fields?: Record<string, string>;
    files: Record<string, MultipartFile>;
}

/** Type guard for {@link MultipartBody}. */
export function isMultipart(body: unknown): body is MultipartBody {
    return !!body && typeof body === 'object' && (body as { kind?: unknown }).kind === 'multipart';
}

/** Runtime-agnostic HTTP request. */
export interface HttpRequest {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
}

/** Runtime-agnostic HTTP response. Never throws on error status; the status is carried in the field. */
export interface HttpResponse<T = unknown> {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    data: T;
}

/**
 * Transport port (DIP). The SDK core depends only on this interface, so the same
 * SDK runs on any runtime: axios on Node, or the host `_axiosRequest` in the RPO
 * sandbox. Implementations MUST resolve with the response even on 4xx/5xx (never
 * reject on HTTP status), like the real `fetch`.
 */
export interface HttpTransport {
    send<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>>;
}

/**
 * Transient-failure retry knobs, tuned per runtime. The Node/GAS defaults are
 * generous (a 6-min GAS budget can absorb long backoffs); the RPO isolate has a
 * short wall-clock limit, so its runtime passes a small cap — a slow backoff there
 * would blow the isolate timeout instead of failing fast with a clean status.
 */
export interface RetryPolicy {
    /** Total attempts before giving up (auth refresh and HTTP transient retries). */
    maxAttempts?: number;
    /** Cap for a single exponential backoff sleep, in ms. */
    maxBackoffMs?: number;
}

/** Standard Hablla paginated payload. */
export interface Paged<T> {
    results: T[];
    count: number;
    totalItems: number;
    page: number;
    limit: number;
    totalPages: number;
}
