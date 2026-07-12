import type { HttpTransport, HttpRequest, HttpResponse, MultipartBody } from '../../sdk/core/types';
import { isMultipart } from '../../sdk/core/types';

interface HostResponse {
    status: number;
    statusText?: string;
    headers: Record<string, string>;
    data: unknown;
}

declare const _axiosRequest: (config: unknown) => Promise<HostResponse>;

/** Strips any caller-supplied Content-Type (case-insensitive) from a header map. */
function stripContentType(headers: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const key of Object.keys(headers)) {
        const value = headers[key];
        if (value !== undefined && key.toLowerCase() !== 'content-type') out[key] = value;
    }
    return out;
}

/**
 * Serializes a byte array to a latin1 (one char per byte) string. The host bridge
 * `_axiosRequest` JSON-stringifies its config, so a body must be a string — a
 * TypedArray would be corrupted into `{"0":..}`. A latin1 string preserves every
 * byte value 0-255 across that boundary. Chunked to avoid call-stack limits.
 */
function bytesToBinaryString(bytes: Uint8Array): string {
    let out = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        out += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    return out;
}

/**
 * Builds a `multipart/form-data` body as a boundary string with a fresh boundary
 * (per RFC 7578) and the matching `Content-Type`. File bytes are emitted as a
 * latin1 string so binary survives the string-only host bridge.
 */
function buildMultipart(body: MultipartBody): { data: string; contentType: string } {
    const boundary = '----hablla' + Date.now().toString(16) + Math.random().toString(16).slice(2);
    const crlf = '\r\n';
    let data = '';

    const fields = body.fields ?? {};
    for (const name of Object.keys(fields)) {
        const value = fields[name] ?? '';
        data += `--${boundary}${crlf}Content-Disposition: form-data; name="${name}"${crlf}${crlf}${value}${crlf}`;
    }

    for (const field of Object.keys(body.files)) {
        const file = body.files[field];
        if (!file) continue;
        const type = file.contentType ?? 'application/octet-stream';
        data += `--${boundary}${crlf}`
            + `Content-Disposition: form-data; name="${field}"; filename="${file.filename}"${crlf}`
            + `Content-Type: ${type}${crlf}${crlf}`
            + bytesToBinaryString(file.data) + crlf;
    }

    data += `--${boundary}--${crlf}`;
    return { data, contentType: `multipart/form-data; boundary=${boundary}` };
}

/**
 * Transport for the Hablla RPO sandbox: uses the host `_axiosRequest` binding.
 *
 * The host ignores `validateStatus` and rejects on 4xx/5xx, but exposes the full
 * response on `err.response`, so this reconstructs the response there — matching
 * the {@link HttpTransport} contract of never rejecting on HTTP status.
 *
 * A multipart body is encoded to a boundary string and the generated Content-Type
 * is set on the request; other bodies pass straight through to `_axiosRequest`.
 */
export class HostTransport implements HttpTransport {
    async send<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
        let headers = req.headers;
        let data = req.body;

        if (isMultipart(req.body)) {
            const built = buildMultipart(req.body);
            data = built.data;
            headers = { ...stripContentType(req.headers ?? {}), 'Content-Type': built.contentType };
        }

        const config = { method: req.method, url: req.url, headers, data, validateStatus: () => true };
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
