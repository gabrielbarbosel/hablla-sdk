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

/** Standard Hablla paginated payload. */
export interface Paged<T> {
    results: T[];
    count: number;
    totalItems: number;
    page: number;
    limit: number;
    totalPages: number;
}
