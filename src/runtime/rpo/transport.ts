import type { HttpTransport, HttpRequest, HttpResponse } from '../../sdk/core/types';

interface HostResponse {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    data: unknown;
}

declare const _axiosRequest: (config: unknown) => Promise<HostResponse>;

/**
 * Transport for the Hablla RPO sandbox: uses the host `_axiosRequest` binding.
 *
 * The host ignores `validateStatus` and rejects on 4xx/5xx, but exposes the full
 * response on `err.response`, so this reconstructs the response there — matching
 * the {@link HttpTransport} contract of never rejecting on HTTP status.
 */
export class HostTransport implements HttpTransport {
    async send<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
        const config = { method: req.method, url: req.url, headers: req.headers, data: req.body, validateStatus: () => true };
        try {
            const res = await _axiosRequest(config);
            return { status: res.status, statusText: res.statusText, headers: res.headers, data: res.data as T };
        } catch (err) {
            const response = (err as { response?: HostResponse }).response;
            if (response) {
                return { status: response.status, statusText: response.statusText, headers: response.headers, data: response.data as T };
            }
            throw err;
        }
    }
}
