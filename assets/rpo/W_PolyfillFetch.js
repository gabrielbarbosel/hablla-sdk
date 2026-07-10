/**
 * @class W_PolyfillFetch
 * @description Camada fetch/Web fiel a spec (WHATWG): Headers (case-insensitive),
 * Blob, File, FormData, Request, Response (json/text/arrayBuffer/blob/clone) e
 * fetch sobre o axios do host (_axiosRequest). O host NAO fornece nada disso nativo.
 * Force-install (as versoes antigas eram incompletas/fake).
 *
 * NOTA DE TRANSPORTE (host): _axiosRequest faz JSON.stringify(config) antes de
 * enviar. Logo o "data" enviado ao host DEVE ser sempre uma STRING (bytes crus
 * viram {"0":..}). Por isso todo body (Blob/FormData/URLSearchParams/typedarray)
 * e serializado para string aqui, com o Content-Type correto. Alem disso o host
 * IGNORA validateStatus e REJEITA em 4xx/5xx expondo err.response completo; por
 * isso o fetch reconstroi a Response a partir de err.response (resolve, nao rejeita).
 */
class W_PolyfillFetch {
    constructor() {
        this.name = "W_PolyfillFetch";
    }
    async execute() {
        var g = typeof globalThis !== "undefined" ? globalThis : global;
        var TE = g.TextEncoder;
        var TD = g.TextDecoder;

        // ── Headers (completo, case-insensitive) ──────────────────────────────
        class HHeaders {
            constructor(init) {
                this._ = new Map();
                if (init === null || init === undefined) return;
                if (init instanceof HHeaders) {
                    init._.forEach(function (v, k) {
                        this._.set(k, v);
                    }, this);
                } else if (Array.isArray(init) || typeof init[Symbol.iterator] === "function") {
                    var it = Array.isArray(init) ? init : Array.from(init);
                    for (var i = 0; i < it.length; i++) this.append(it[i][0], it[i][1]);
                } else {
                    Object.keys(init).forEach(function (k) {
                        this.append(k, init[k]);
                    }, this);
                }
            }
            append(k, v) {
                k = String(k).toLowerCase();
                v = String(v).replace(/^[\t\n\r ]+|[\t\n\r ]+$/g, "");
                var e = this._.get(k);
                this._.set(k, e !== undefined ? e + ", " + v : v);
            }
            set(k, v) {
                this._.set(String(k).toLowerCase(), String(v).replace(/^[\t\n\r ]+|[\t\n\r ]+$/g, ""));
            }
            get(k) {
                var v = this._.get(String(k).toLowerCase());
                return v === undefined ? null : v;
            }
            has(k) {
                return this._.has(String(k).toLowerCase());
            }
            delete(k) {
                this._.delete(String(k).toLowerCase());
            }
            getSetCookie() {
                var v = this._.get("set-cookie");
                return v === undefined ? [] : v.split(", ");
            }
            forEach(cb, t) {
                // spec: iteracao em ordem alfabetica de chave
                var keys = Array.from(this._.keys()).sort();
                for (var i = 0; i < keys.length; i++) cb.call(t, this._.get(keys[i]), keys[i], this);
            }
            keys() {
                return Array.from(this._.keys()).sort()[Symbol.iterator]();
            }
            values() {
                var self = this;
                return Array.from(this._.keys()).sort().map(function (k) { return self._.get(k); })[Symbol.iterator]();
            }
            entries() {
                var self = this;
                return Array.from(this._.keys()).sort().map(function (k) { return [k, self._.get(k)]; })[Symbol.iterator]();
            }
            [Symbol.iterator]() {
                return this.entries();
            }
        }
        g.Headers = HHeaders;

        // ── Blob / File ───────────────────────────────────────────────────────
        function partToBytes(p) {
            if (p instanceof Uint8Array) return p;
            if (p instanceof HBlob) return p._bytes;
            if (p instanceof ArrayBuffer) return new Uint8Array(p);
            if (ArrayBuffer.isView(p)) return new Uint8Array(p.buffer, p.byteOffset, p.byteLength);
            return new TE().encode(String(p));
        }
        class HBlob {
            constructor(parts, opts) {
                opts = opts || {};
                var chunks = [], i, len = 0;
                parts = parts || [];
                for (i = 0; i < parts.length; i++) {
                    var c = partToBytes(parts[i]);
                    chunks.push(c);
                    len += c.length;
                }
                this._bytes = new Uint8Array(len);
                var off = 0;
                for (i = 0; i < chunks.length; i++) {
                    this._bytes.set(chunks[i], off);
                    off += chunks[i].length;
                }
                this.size = len;
                this.type = opts.type ? String(opts.type).toLowerCase() : "";
            }
            async text() {
                return new TD().decode(this._bytes);
            }
            async arrayBuffer() {
                return this._bytes.buffer.slice(this._bytes.byteOffset, this._bytes.byteOffset + this._bytes.byteLength);
            }
            async bytes() {
                return this._bytes.slice();
            }
            slice(s, e, type) {
                var n = this.size;
                s = s === undefined ? 0 : (s < 0 ? Math.max(n + s, 0) : Math.min(s, n));
                e = e === undefined ? n : (e < 0 ? Math.max(n + e, 0) : Math.min(e, n));
                var end = Math.max(e, s);
                return new HBlob([this._bytes.slice(s, end)], { type: type !== undefined ? type : "" });
            }
            stream() {
                var bytes = this._bytes;
                return new g.ReadableStream({
                    start: function (c) {
                        c.enqueue(bytes);
                        c.close();
                    },
                });
            }
            get [Symbol.toStringTag]() {
                return "Blob";
            }
        }
        g.Blob = HBlob;
        class HFile extends HBlob {
            constructor(parts, name, opts) {
                super(parts, opts);
                this.name = String(name);
                this.lastModified = opts && opts.lastModified != null ? opts.lastModified : Date.now();
            }
            get [Symbol.toStringTag]() {
                return "File";
            }
        }
        g.File = HFile;

        // ── FormData ──────────────────────────────────────────────────────────
        function coerceFormValue(v, fn) {
            // spec: valores viram string OU sao Blob/File; filename opcional
            if (v instanceof HBlob) {
                if (fn !== undefined && !(v instanceof HFile)) {
                    return new HFile([v._bytes], String(fn), { type: v.type });
                }
                if (fn !== undefined && v instanceof HFile) {
                    return new HFile([v._bytes], String(fn), { type: v.type, lastModified: v.lastModified });
                }
                return v;
            }
            return String(v);
        }
        class HFormData {
            constructor() {
                this._ = [];
            }
            append(k, v, fn) {
                this._.push([String(k), coerceFormValue(v, fn)]);
            }
            set(k, v, fn) {
                k = String(k);
                var val = coerceFormValue(v, fn);
                var placed = false;
                var next = [];
                for (var i = 0; i < this._.length; i++) {
                    if (this._[i][0] === k) {
                        if (!placed) {
                            next.push([k, val]);
                            placed = true;
                        }
                    } else {
                        next.push(this._[i]);
                    }
                }
                if (!placed) next.push([k, val]);
                this._ = next;
            }
            delete(k) {
                k = String(k);
                this._ = this._.filter(function (e) {
                    return e[0] !== k;
                });
            }
            get(k) {
                k = String(k);
                var e = this._.find(function (e) {
                    return e[0] === k;
                });
                return e ? e[1] : null;
            }
            getAll(k) {
                k = String(k);
                return this._.filter(function (e) {
                    return e[0] === k;
                }).map(function (e) {
                    return e[1];
                });
            }
            has(k) {
                k = String(k);
                return this._.some(function (e) {
                    return e[0] === k;
                });
            }
            forEach(cb, t) {
                this._.slice().forEach(function (e) {
                    cb.call(t, e[1], e[0], this);
                }, this);
            }
            keys() {
                return this._.map(function (e) {
                    return e[0];
                })[Symbol.iterator]();
            }
            values() {
                return this._.map(function (e) {
                    return e[1];
                })[Symbol.iterator]();
            }
            entries() {
                return this._.map(function (e) {
                    return [e[0], e[1]];
                })[Symbol.iterator]();
            }
            [Symbol.iterator]() {
                return this.entries();
            }
            get [Symbol.toStringTag]() {
                return "FormData";
            }
        }
        g.FormData = HFormData;

        // ── util: bytes crus de qualquer body-ish ─────────────────────────────
        function rawBytes(b) {
            if (b === null || b === undefined) return new Uint8Array(0);
            if (typeof b === "string") return new TE().encode(b);
            if (b instanceof HBlob) return b._bytes;
            if (b instanceof Uint8Array) return b;
            if (b instanceof ArrayBuffer) return new Uint8Array(b);
            if (ArrayBuffer.isView(b)) return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
            if (g.URLSearchParams && b instanceof g.URLSearchParams) return new TE().encode(b.toString());
            return new TE().encode(JSON.stringify(b));
        }

        // ── Body mixin (compartilhado por Response/Request) ───────────────────
        function defineBody(proto) {
            proto._checkUsed = function () {
                if (this.bodyUsed) throw new TypeError("Body ja foi consumido");
                this.bodyUsed = true;
            };
            proto.text = async function () {
                this._checkUsed();
                var b = this._body;
                if (b === null || b === undefined) return "";
                if (typeof b === "string") return b;
                return new TD().decode(rawBytes(b));
            };
            proto.json = async function () {
                return JSON.parse(await this.text());
            };
            proto.arrayBuffer = async function () {
                this._checkUsed();
                var by = rawBytes(this._body);
                return by.buffer.slice(by.byteOffset, by.byteOffset + by.byteLength);
            };
            proto.bytes = async function () {
                this._checkUsed();
                return rawBytes(this._body).slice();
            };
            proto.blob = async function () {
                this._checkUsed();
                var ct = this.headers && this.headers.get ? this.headers.get("content-type") : null;
                return new HBlob([rawBytes(this._body)], { type: ct || "" });
            };
            proto.formData = async function () {
                var txt = await this.text();
                var fd = new HFormData();
                var ct = this.headers && this.headers.get ? this.headers.get("content-type") || "" : "";
                if (ct.indexOf("application/x-www-form-urlencoded") >= 0) {
                    var usp = new g.URLSearchParams(txt);
                    usp.forEach(function (v, k) {
                        fd.append(k, v);
                    });
                }
                return fd;
            };
        }

        // ── Response (completo) ───────────────────────────────────────────────
        class HResponse {
            constructor(body, init) {
                init = init || {};
                var nullBody = body === null || body === undefined;
                this._body = nullBody ? null : body;
                this.status = init.status != null ? init.status : 200;
                this.statusText = init.statusText != null ? String(init.statusText) : "";
                this.ok = this.status >= 200 && this.status < 300;
                this.headers = init.headers instanceof HHeaders ? init.headers : new HHeaders(init.headers);
                this.url = init.url || "";
                this.redirected = !!init.redirected;
                this.type = init.type || "default";
                this.bodyUsed = false;
                // se body e Blob com type e nao ha content-type, herda
                if (body instanceof HBlob && body.type && !this.headers.has("content-type")) {
                    this.headers.set("content-type", body.type);
                }
            }
            get body() {
                if (this._body === null || this._body === undefined) return null;
                var bytes = rawBytes(this._body);
                return new g.ReadableStream({
                    start: function (c) {
                        c.enqueue(bytes);
                        c.close();
                    },
                });
            }
            clone() {
                if (this.bodyUsed) throw new TypeError("Nao e possivel clonar Response ja consumida");
                return new HResponse(this._body, {
                    status: this.status,
                    statusText: this.statusText,
                    headers: new HHeaders(this.headers),
                    url: this.url,
                    redirected: this.redirected,
                    type: this.type,
                });
            }
        }
        defineBody(HResponse.prototype);
        HResponse.json = function (data, init) {
            init = init || {};
            var h = new HHeaders(init.headers);
            if (!h.has("content-type")) h.set("content-type", "application/json");
            return new HResponse(JSON.stringify(data), { status: init.status, statusText: init.statusText, headers: h });
        };
        HResponse.error = function () {
            var r = new HResponse(null, { status: 0 });
            r.type = "error";
            r.ok = false;
            return r;
        };
        HResponse.redirect = function (url, status) {
            var h = new HHeaders();
            h.set("location", String(url));
            return new HResponse(null, { status: status || 302, headers: h });
        };
        g.Response = HResponse;

        // ── Request ───────────────────────────────────────────────────────────
        class HRequest {
            constructor(input, init) {
                init = init || {};
                var isReq = input instanceof HRequest;
                this.url = typeof input === "string" ? input : (input && input.url) || "";
                this.method = String(init.method || (isReq ? input.method : "GET") || "GET").toUpperCase();
                this.headers = new HHeaders(init.headers !== undefined ? init.headers : isReq ? input.headers : null);
                var b = init.body !== undefined ? init.body : isReq ? input._body : null;
                this._body = b === undefined ? null : b;
                this.body = this._body;
                this.signal = init.signal || (isReq ? input.signal : null) || null;
                this.credentials = init.credentials || (isReq ? input.credentials : "same-origin");
                this.mode = init.mode || (isReq ? input.mode : "cors");
                this.redirect = init.redirect || (isReq ? input.redirect : "follow");
                this.bodyUsed = false;
            }
            clone() {
                if (this.bodyUsed) throw new TypeError("Nao e possivel clonar Request ja consumida");
                return new HRequest(this.url, {
                    method: this.method,
                    headers: new HHeaders(this.headers),
                    body: this._body,
                    signal: this.signal,
                    credentials: this.credentials,
                    mode: this.mode,
                    redirect: this.redirect,
                });
            }
        }
        defineBody(HRequest.prototype);
        g.Request = HRequest;

        // ── fetch (sobre o axios do host: _axiosRequest) ──────────────────────
        function setDefaultCT(hdrs, ct) {
            if (!hdrs.has("content-type")) hdrs.set("content-type", ct);
        }
        function randBoundary() {
            return "----HabllaBoundary" + Math.random().toString(16).slice(2) + Date.now().toString(16);
        }
        function encodeMultipart(fd, hdrs) {
            var boundary = randBoundary();
            var CRLF = "\r\n";
            var body = "";
            var items = fd._;
            for (var i = 0; i < items.length; i++) {
                var fieldName = items[i][0];
                var value = items[i][1];
                body += "--" + boundary + CRLF;
                if (value instanceof HBlob) {
                    var fname = value instanceof HFile ? value.name : "blob";
                    body += 'Content-Disposition: form-data; name="' + fieldName + '"; filename="' + fname + '"' + CRLF;
                    body += "Content-Type: " + (value.type || "application/octet-stream") + CRLF + CRLF;
                    body += new TD().decode(value._bytes) + CRLF;
                } else {
                    body += 'Content-Disposition: form-data; name="' + fieldName + '"' + CRLF + CRLF;
                    body += String(value) + CRLF;
                }
            }
            body += "--" + boundary + "--" + CRLF;
            hdrs.set("content-type", "multipart/form-data; boundary=" + boundary);
            return body;
        }
        function serializeBody(body, hdrs) {
            if (body === null || body === undefined) return undefined;
            if (typeof body === "string") {
                setDefaultCT(hdrs, "text/plain;charset=UTF-8");
                return body;
            }
            if (g.URLSearchParams && body instanceof g.URLSearchParams) {
                setDefaultCT(hdrs, "application/x-www-form-urlencoded;charset=UTF-8");
                return body.toString();
            }
            if (body instanceof HFormData) {
                return encodeMultipart(body, hdrs);
            }
            if (body instanceof HBlob) {
                if (body.type) setDefaultCT(hdrs, body.type);
                return new TD().decode(body._bytes);
            }
            if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
                return new TD().decode(rawBytes(body));
            }
            // objeto arbitrario: comportamento pratico -> string
            return String(body);
        }

        if (typeof _axiosRequest === "function") {
            g.fetch = function fetch(input, init) {
                init = init || {};
                var isReq = input instanceof HRequest;
                var reqUrl = isReq ? input.url : String(input);
                var method = String(init.method || (isReq ? input.method : "GET") || "GET").toUpperCase();
                var hdrs = new HHeaders(init.headers !== undefined ? init.headers : isReq ? input.headers : null);
                var rawBody = init.body !== undefined ? init.body : isReq ? input._body : null;
                var signal = init.signal || (isReq ? input.signal : null) || null;

                var dataStr;
                if (method === "GET" || method === "HEAD") {
                    dataStr = undefined;
                } else {
                    dataStr = serializeBody(rawBody, hdrs);
                }

                var headersObj = {};
                hdrs.forEach(function (v, k) {
                    headersObj[k] = v;
                });

                var config = {
                    url: reqUrl,
                    method: method,
                    headers: headersObj,
                    data: dataStr,
                    validateStatus: function () {
                        return true;
                    },
                };

                function toResponse(res) {
                    var body =
                        res.data === null || res.data === undefined
                            ? null
                            : typeof res.data === "string"
                            ? res.data
                            : JSON.stringify(res.data);
                    return new HResponse(body, {
                        status: res.status,
                        statusText: res.statusText || "",
                        headers: res.headers,
                        url: reqUrl,
                    });
                }

                function abortError() {
                    if (signal && signal.reason !== undefined && signal.reason !== null) return signal.reason;
                    if (typeof g.DOMException === "function") return new g.DOMException("The operation was aborted.", "AbortError");
                    var e = new Error("The operation was aborted.");
                    e.name = "AbortError";
                    return e;
                }

                return new Promise(function (resolve, reject) {
                    var settled = false;
                    function finish(fn, val) {
                        if (settled) return;
                        settled = true;
                        fn(val);
                    }
                    if (signal && signal.aborted) {
                        finish(reject, abortError());
                        return;
                    }
                    if (signal && typeof signal.addEventListener === "function") {
                        signal.addEventListener("abort", function () {
                            finish(reject, abortError());
                        });
                    }
                    // O host _axiosRequest REJEITA em 4xx/5xx (ignora validateStatus),
                    // mas err.response tem a resposta completa -> resolvemos com ela.
                    _axiosRequest(config).then(
                        function (res) {
                            finish(resolve, toResponse(res));
                        },
                        function (err) {
                            if (err && err.response) {
                                finish(resolve, toResponse(err.response));
                            } else {
                                finish(reject, new TypeError("Failed to fetch: " + (err && err.message ? err.message : String(err))));
                            }
                        }
                    );
                });
            };
        }

        return { ok: true, message: "W_PolyfillFetch instalado" };
    }
}

await new W_PolyfillFetch().execute();
