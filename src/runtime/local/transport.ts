import axios from 'axios';
import type { HttpTransport, HttpRequest, HttpResponse, MultipartBody } from '../../sdk/core/types';
import { isMultipart } from '../../sdk/core/types';

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
 * Builds a `multipart/form-data` body in a Buffer with a fresh boundary. No external
 * dependency: each field/file is emitted as a part per RFC 7578. Returns the buffer
 * and the matching `Content-Type` header (boundary included).
 */
function buildMultipart(body: MultipartBody): { buffer: Buffer; contentType: string } {
    const boundary = '----hablla' + Date.now().toString(16) + Math.random().toString(16).slice(2);
    const chunks: Buffer[] = [];
    const crlf = '\r\n';

    const fields = body.fields ?? {};
    for (const name of Object.keys(fields)) {
        const value = fields[name] ?? '';
        chunks.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="${name}"${crlf}${crlf}${value}${crlf}`));
    }

    for (const field of Object.keys(body.files)) {
        const file = body.files[field];
        if (!file) continue;
        const type = file.contentType ?? 'application/octet-stream';
        const header = `--${boundary}${crlf}`
            + `Content-Disposition: form-data; name="${field}"; filename="${file.filename}"${crlf}`
            + `Content-Type: ${type}${crlf}${crlf}`;
        chunks.push(Buffer.from(header));
        chunks.push(Buffer.from(file.data));
        chunks.push(Buffer.from(crlf));
    }

    chunks.push(Buffer.from(`--${boundary}--${crlf}`));
    return { buffer: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

/**
 * Local (Node) transport backed by axios. Never rejects on error status
 * (`validateStatus: () => true`); the {@link HttpTransport} contract is to always
 * resolve with the response, like the real `fetch`. A multipart body is encoded to
 * a Buffer with the generated boundary; other bodies (string or JSON object) are
 * passed straight to axios.
 */
export class AxiosTransport implements HttpTransport {
    async send<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
        let headers = req.headers ?? {};
        let data = req.body;

        if (isMultipart(req.body)) {
            const built = buildMultipart(req.body);
            data = built.buffer;
            headers = { ...stripContentType(headers), 'Content-Type': built.contentType };
        }

        const res = await axios.request<T>({
            method: req.method,
            url: req.url,
            headers,
            data,
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
