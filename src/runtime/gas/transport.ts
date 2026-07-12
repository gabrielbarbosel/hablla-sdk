import type { HttpTransport, HttpRequest, HttpResponse, MultipartFile } from '../../sdk/core/types';
import { isMultipart } from '../../sdk/core/types';

/** Bindings do Apps Script (só os que o transporte usa). */
declare const UrlFetchApp: {
    fetch(url: string, params: Record<string, unknown>): {
        getResponseCode(): number;
        getContentText(): string;
        getAllHeaders(): Record<string, string>;
    };
};

declare const Utilities: {
    newBlob(data: number[] | Uint8Array, contentType?: string, name?: string): unknown;
};

/** Remove a chave `Content-Type` (case-insensitive) de um mapa de headers. */
function stripContentType(headers: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const key of Object.keys(headers)) {
        const value = headers[key];
        if (value !== undefined && key.toLowerCase() !== 'content-type') out[key] = value;
    }
    return out;
}

/** Header `Content-Type` informado (case-insensitive), se houver. */
function contentTypeOf(headers: Record<string, string>): string | undefined {
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === 'content-type') return headers[key];
    }
    return undefined;
}

/**
 * Transporte GAS backed por `UrlFetchApp` (síncrono). Nunca rejeita em erro de status
 * (`muteHttpExceptions: true`) — o contrato {@link HttpTransport} é sempre resolver com
 * a resposta, como o `fetch` real. O corpo já resolvido é envolvido pelo Promise
 * (síncrono) do docker, então a chamada inteira resolve inline.
 *
 * Serialização por corpo:
 *  - multipart ({@link MultipartBody}): payload objeto com `Utilities.newBlob` por
 *    arquivo (o UrlFetchApp faz o boundary automático); o `Content-Type` é removido
 *    dos headers para não conflitar com o boundary gerado.
 *  - string: enviada crua com o `Content-Type` informado (ex.: o refresh de token
 *    manda `grant_type=...` como x-www-form-urlencoded), sem duplicar o header.
 *  - objeto JSON: `JSON.stringify` com `application/json`.
 */
export class UrlFetchTransport implements HttpTransport {
    send<T = unknown>(req: HttpRequest): Promise<HttpResponse<T>> {
        const hasBody = req.body != null && req.method.toUpperCase() !== 'GET';
        const headers = req.headers ?? {};
        const params: Record<string, unknown> = {
            method: req.method.toLowerCase(),
            headers,
            muteHttpExceptions: true,
            followRedirects: true,
        };

        if (hasBody && isMultipart(req.body)) {
            const payload: Record<string, unknown> = { ...(req.body.fields ?? {}) };
            const files = req.body.files;
            for (const field of Object.keys(files)) {
                const file: MultipartFile | undefined = files[field];
                if (!file) continue;
                payload[field] = Utilities.newBlob(file.data, file.contentType, file.filename);
            }
            params.payload = payload; // objeto com Blob → UrlFetchApp envia multipart/form-data
            params.headers = stripContentType(headers); // boundary é gerado pelo UrlFetchApp
        } else if (hasBody && typeof req.body === 'string') {
            params.contentType = contentTypeOf(headers) ?? 'application/json';
            params.payload = req.body;
            params.headers = stripContentType(headers); // evita duplicar Content-Type
        } else if (hasBody) {
            params.contentType = 'application/json';
            params.payload = JSON.stringify(req.body);
            params.headers = stripContentType(headers);
        }

        const response = UrlFetchApp.fetch(req.url, params);

        const status = response.getResponseCode();
        const text = response.getContentText();
        let data: unknown = text;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }

        return Promise.resolve({
            status,
            headers: response.getAllHeaders() as Record<string, string>,
            data: data as T,
        });
    }
}
