import axios from 'axios';
import type { HttpTransport, HttpRequest, HttpResponse } from '../../sdk/core/types';

/**
 * Local (Node) transport backed by axios. Never rejects on error status
 * (`validateStatus: () => true`); the {@link HttpTransport} contract is to always
 * resolve with the response, like the real `fetch`.
 */
export class AxiosTransport implements HttpTransport {
    async send<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
        const res = await axios.request<T>({
            method: req.method,
            url: req.url,
            headers: req.headers,
            data: req.body,
            validateStatus: () => true,
        });
        return {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers as unknown as Record<string, string>,
            data: res.data,
        };
    }
}
