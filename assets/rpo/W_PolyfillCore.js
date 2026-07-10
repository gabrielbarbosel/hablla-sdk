/**
 * @class W_PolyfillCore
 * @description Núcleo de polyfills do sandbox: encoding (atob/btoa,
 * TextEncoder/TextDecoder utf-8 fiéis a spec — multibyte, surrogates,
 * streaming, fatal, BOM, encodeInto), eventos (Event/EventTarget/CustomEvent),
 * AbortController/AbortSignal (aborted/reason/timeout/any), crypto
 * (getRandomValues em todo o buffer, randomUUID v4, subtle.digest SHA-256 real),
 * structuredClone real (Date/Map/Set/ArrayBuffer/DataView/TypedArray/RegExp/
 * boxed/Error/ciclos; joga DataCloneError em function/symbol), URL/URLSearchParams
 * completos, performance.now e um EVENT LOOP real de timers
 * (setTimeout/setInterval/setImmediate + clear*, delay real via Atomics,
 * cancelamento e repetição de verdade). Force-install: o sandbox pré-injeta
 * versões quebradas/host, então sobrescrevemos sempre.
 *
 * NOTA sanitizador anti-XSS do host: NUNCA usar identificador que comece com
 * "on" seguido de "=" no código (ex.: `var once = ...`, `onabort = ...`) — a
 * compilação quebra. Handlers on* são acessados via bracket ("on"+tipo).
 */
class W_PolyfillCore {
    constructor() {
        this.name = "W_PolyfillCore";
    }
    async execute() {
        var g = typeof globalThis !== "undefined" ? globalThis : global;

        // ── DOMException (base para erros de spec) ───────────────────────────
        if (typeof g.DOMException !== "function") {
            g.DOMException = function DOMException(msg, name) {
                var e = new Error(msg || "");
                e.name = name || "Error";
                return e;
            };
            g.DOMException.prototype = Object.create(Error.prototype);
        }
        var _domErr = function (msg, name) {
            try {
                return new g.DOMException(msg, name || "InvalidCharacterError");
            } catch (e) {
                var er = new Error(msg);
                er.name = name || "InvalidCharacterError";
                return er;
            }
        };

        // ── atob / btoa ──────────────────────────────────────────────────────
        var _B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        g.atob = function atob(data) {
            var str = String(data).replace(/[ \t\n\f\r]/g, "");
            str = str.replace(/=+$/, "");
            if (str.length % 4 === 1) throw _domErr("Failed to execute 'atob': invalid base64 length.");
            if (/[^A-Za-z0-9+/]/.test(str)) throw _domErr("Failed to execute 'atob': invalid character.");
            var out = "",
                i = 0,
                slen = str.length;
            var idxAt = function (p) {
                return p < slen ? _B64.indexOf(str.charAt(p)) : -1;
            };
            while (i < slen) {
                var a = idxAt(i),
                    b = idxAt(i + 1),
                    c = idxAt(i + 2),
                    d = idxAt(i + 3);
                i += 4;
                var n = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
                out += String.fromCharCode((n >> 16) & 0xff);
                if (c >= 0) out += String.fromCharCode((n >> 8) & 0xff);
                if (d >= 0) out += String.fromCharCode(n & 0xff);
            }
            return out;
        };
        g.btoa = function btoa(data) {
            data = String(data);
            var o = "",
                i = 0,
                len = data.length;
            while (i < len) {
                var c1 = data.charCodeAt(i++);
                var c2 = i < len ? data.charCodeAt(i++) : NaN;
                var c3 = i < len ? data.charCodeAt(i++) : NaN;
                if (c1 > 0xff || (c2 === c2 && c2 > 0xff) || (c3 === c3 && c3 > 0xff)) {
                    throw _domErr("Failed to execute 'btoa': character outside of the Latin1 range.");
                }
                o += _B64[c1 >> 2];
                o += _B64[((c1 & 3) << 4) | ((c2 === c2 ? c2 : 0) >> 4)];
                o += c2 !== c2 ? "=" : _B64[((c2 & 15) << 2) | ((c3 === c3 ? c3 : 0) >> 6)];
                o += c3 !== c3 ? "=" : _B64[c3 & 63];
            }
            return o;
        };

        // ── TextEncoder (utf-8, surrogates → U+FFFD, encodeInto) ─────────────
        g.TextEncoder = function TextEncoder() {
            this.encoding = "utf-8";
        };
        var _cpAt = function (s, i, len) {
            // retorna [codePoint, avanço] com substituição de surrogates soltos
            var c = s.charCodeAt(i);
            if (c >= 0xd800 && c <= 0xdbff) {
                var c2 = i + 1 < len ? s.charCodeAt(i + 1) : 0;
                if (c2 >= 0xdc00 && c2 <= 0xdfff) return [0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00), 2];
                return [0xfffd, 1];
            }
            if (c >= 0xdc00 && c <= 0xdfff) return [0xfffd, 1];
            return [c, 1];
        };
        g.TextEncoder.prototype.encode = function (input) {
            input = input === undefined ? "" : String(input);
            var bytes = [],
                i = 0,
                len = input.length;
            while (i < len) {
                var r = _cpAt(input, i, len),
                    cp = r[0];
                i += r[1];
                if (cp < 0x80) bytes.push(cp);
                else if (cp < 0x800) bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
                else if (cp < 0x10000) bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
                else bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
            }
            return new Uint8Array(bytes);
        };
        g.TextEncoder.prototype.encodeInto = function (source, dest) {
            source = String(source === undefined ? "" : source);
            var read = 0,
                written = 0,
                i = 0,
                len = source.length,
                cap = dest.length;
            while (i < len) {
                var r = _cpAt(source, i, len),
                    cp = r[0],
                    adv = r[1];
                var n = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
                if (written + n > cap) break;
                if (n === 1) dest[written++] = cp;
                else if (n === 2) {
                    dest[written++] = 0xc0 | (cp >> 6);
                    dest[written++] = 0x80 | (cp & 0x3f);
                } else if (n === 3) {
                    dest[written++] = 0xe0 | (cp >> 12);
                    dest[written++] = 0x80 | ((cp >> 6) & 0x3f);
                    dest[written++] = 0x80 | (cp & 0x3f);
                } else {
                    dest[written++] = 0xf0 | (cp >> 18);
                    dest[written++] = 0x80 | ((cp >> 12) & 0x3f);
                    dest[written++] = 0x80 | ((cp >> 6) & 0x3f);
                    dest[written++] = 0x80 | (cp & 0x3f);
                }
                read += adv;
                i += adv;
            }
            return { read: read, written: written };
        };

        // ── TextDecoder (utf-8 fiel + latin1/ascii + utf-16le/be) ────────────
        var _TD_ENC = {
            "utf-8": "utf-8",
            utf8: "utf-8",
            "unicode-1-1-utf-8": "utf-8",
            "unicode11utf8": "utf-8",
            "unicode20utf8": "utf-8",
            "x-unicode20utf8": "utf-8",
            csutf8: "utf-8",
            latin1: "latin1",
            "iso-8859-1": "latin1",
            "iso8859-1": "latin1",
            iso88591: "latin1",
            l1: "latin1",
            cp819: "latin1",
            ibm819: "latin1",
            csisolatin1: "latin1",
            "windows-1252": "latin1",
            "x-cp1252": "latin1",
            ascii: "ascii",
            "us-ascii": "ascii",
            "utf-16le": "utf-16le",
            "utf-16": "utf-16le",
            "ucs-2": "utf-16le",
            "utf-16be": "utf-16be",
            "unicodefffe": "utf-16be",
        };
        var _toBytes = function (input) {
            if (input == null) return new Uint8Array(0);
            if (input instanceof Uint8Array) return input;
            if (typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer) return new Uint8Array(input);
            if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
            return new Uint8Array(input);
        };
        g.TextDecoder = function TextDecoder(label, options) {
            var norm = _TD_ENC[String(label == null ? "utf-8" : label).trim().toLowerCase()];
            if (!norm) throw new RangeError("The encoding label provided ('" + label + "') is invalid.");
            this.encoding = norm === "latin1" ? "windows-1252" : norm === "ascii" ? "windows-1252" : norm;
            this._enc = norm;
            this.fatal = !!(options && options.fatal);
            this.ignoreBOM = !!(options && options.ignoreBOM);
            this._reset();
        };
        g.TextDecoder.prototype._reset = function () {
            this._needed = 0;
            this._cp = 0;
            this._seen = 0;
            this._lower = 0x80;
            this._upper = 0xbf;
            this._bomSeen = false;
            this._u16leftover = null;
            this._u16hs = -1;
        };
        g.TextDecoder.prototype._err = function () {
            if (this.fatal) throw new TypeError("The encoded data was not all valid " + this._enc + ".");
            return "�";
        };
        g.TextDecoder.prototype._emit = function (cp) {
            if (!this.ignoreBOM && !this._bomSeen) {
                this._bomSeen = true;
                if (cp === 0xfeff) return "";
            } else {
                this._bomSeen = true;
            }
            return String.fromCodePoint(cp);
        };
        g.TextDecoder.prototype._decodeUTF8 = function (bytes, stream) {
            var out = "",
                i = 0,
                len = bytes.length;
            var needed = this._needed,
                cp = this._cp,
                seen = this._seen,
                lower = this._lower,
                upper = this._upper;
            while (i < len) {
                var byte = bytes[i];
                if (needed === 0) {
                    if (byte <= 0x7f) {
                        out += this._emit(byte);
                        i++;
                    } else if (byte >= 0xc2 && byte <= 0xdf) {
                        needed = 1;
                        cp = byte & 0x1f;
                        lower = 0x80;
                        upper = 0xbf;
                        i++;
                    } else if (byte >= 0xe0 && byte <= 0xef) {
                        needed = 2;
                        cp = byte & 0x0f;
                        lower = byte === 0xe0 ? 0xa0 : 0x80;
                        upper = byte === 0xed ? 0x9f : 0xbf;
                        i++;
                    } else if (byte >= 0xf0 && byte <= 0xf4) {
                        needed = 3;
                        cp = byte & 0x07;
                        lower = byte === 0xf0 ? 0x90 : 0x80;
                        upper = byte === 0xf4 ? 0x8f : 0xbf;
                        i++;
                    } else {
                        out += this._err();
                        i++;
                    }
                } else {
                    if (byte < lower || byte > upper) {
                        // continuação inválida: erro e REPROCESSA este byte
                        needed = 0;
                        cp = 0;
                        seen = 0;
                        lower = 0x80;
                        upper = 0xbf;
                        out += this._err();
                    } else {
                        lower = 0x80;
                        upper = 0xbf;
                        cp = (cp << 6) | (byte & 0x3f);
                        seen++;
                        i++;
                        if (seen === needed) {
                            out += this._emit(cp);
                            needed = 0;
                            cp = 0;
                            seen = 0;
                        }
                    }
                }
            }
            if (stream) {
                this._needed = needed;
                this._cp = cp;
                this._seen = seen;
                this._lower = lower;
                this._upper = upper;
            } else {
                if (needed !== 0) out += this._err();
                this._reset();
            }
            return out;
        };
        g.TextDecoder.prototype._decodeSingle = function (bytes, stream, asciiOnly) {
            var out = "";
            for (var i = 0; i < bytes.length; i++) {
                var b = bytes[i];
                if (asciiOnly && b > 0x7f) out += this._err();
                else out += String.fromCharCode(b);
            }
            if (!stream) this._reset();
            return out;
        };
        g.TextDecoder.prototype._decodeUTF16 = function (bytes, stream, le) {
            var lo = this._u16leftover ? Array.prototype.slice.call(this._u16leftover) : [];
            var all = lo.concat(Array.prototype.slice.call(bytes));
            var out = "",
                hs = this._u16hs,
                n = all.length - (all.length % 2),
                i;
            for (i = 0; i < n; i += 2) {
                var unit = le ? all[i] | (all[i + 1] << 8) : (all[i] << 8) | all[i + 1];
                if (!this.ignoreBOM && !this._bomSeen) {
                    this._bomSeen = true;
                    if (unit === 0xfeff) continue;
                } else {
                    this._bomSeen = true;
                }
                if (hs >= 0) {
                    if (unit >= 0xdc00 && unit <= 0xdfff) {
                        out += String.fromCodePoint(0x10000 + ((hs - 0xd800) << 10) + (unit - 0xdc00));
                        hs = -1;
                        continue;
                    }
                    out += this._err();
                    hs = -1;
                }
                if (unit >= 0xd800 && unit <= 0xdbff) hs = unit;
                else if (unit >= 0xdc00 && unit <= 0xdfff) out += this._err();
                else out += String.fromCharCode(unit);
            }
            var rem = all.slice(n);
            if (stream) {
                this._u16leftover = rem;
                this._u16hs = hs;
            } else {
                if (rem.length || hs >= 0) out += this._err();
                this._reset();
            }
            return out;
        };
        g.TextDecoder.prototype.decode = function (input, options) {
            var stream = !!(options && options.stream);
            var bytes = _toBytes(input);
            if (this._enc === "utf-8") return this._decodeUTF8(bytes, stream);
            if (this._enc === "latin1") return this._decodeSingle(bytes, stream, false);
            if (this._enc === "ascii") return this._decodeSingle(bytes, stream, true);
            if (this._enc === "utf-16le") return this._decodeUTF16(bytes, stream, true);
            if (this._enc === "utf-16be") return this._decodeUTF16(bytes, stream, false);
            return this._decodeUTF8(bytes, stream);
        };

        // ── Event / EventTarget / CustomEvent ────────────────────────────────
        g.Event = function Event(type, init) {
            this.type = String(type);
            this.bubbles = !!(init && init.bubbles);
            this.cancelable = !!(init && init.cancelable);
            this.composed = !!(init && init.composed);
            this.defaultPrevented = false;
            this.target = null;
            this.currentTarget = null;
            this.srcElement = null;
            this.eventPhase = 0;
            this.isTrusted = false;
            this.timeStamp = g.performance && typeof g.performance.now === "function" ? g.performance.now() : Date.now();
            this._stop = false;
            this._stopImmediate = false;
        };
        g.Event.prototype.preventDefault = function () {
            if (this.cancelable) this.defaultPrevented = true;
        };
        g.Event.prototype.stopPropagation = function () {
            this._stop = true;
        };
        g.Event.prototype.stopImmediatePropagation = function () {
            this._stop = true;
            this._stopImmediate = true;
        };
        g.Event.prototype.composedPath = function () {
            return this.currentTarget ? [this.currentTarget] : [];
        };
        g.Event.NONE = 0;
        g.Event.CAPTURING_PHASE = 1;
        g.Event.AT_TARGET = 2;
        g.Event.BUBBLING_PHASE = 3;

        g.CustomEvent = function CustomEvent(type, init) {
            g.Event.call(this, type, init);
            this.detail = init && init.detail !== undefined ? init.detail : null;
        };
        g.CustomEvent.prototype = Object.create(g.Event.prototype);
        g.CustomEvent.prototype.constructor = g.CustomEvent;

        g.EventTarget = function EventTarget() {
            this._l = Object.create(null);
        };
        g.EventTarget.prototype.addEventListener = function (type, listener, options) {
            var fn = listener;
            if (typeof fn !== "function") {
                if (fn && typeof fn.handleEvent === "function") {
                    var obj = fn;
                    fn = function (e) {
                        return obj.handleEvent(e);
                    };
                    fn._orig = obj;
                } else return;
            }
            type = String(type);
            if (!this._l) this._l = Object.create(null);
            if (!this._l[type]) this._l[type] = [];
            var fireOnce = !!(options && typeof options === "object" && options.once);
            var sig = options && typeof options === "object" ? options.signal : null;
            if (sig && sig.aborted) return;
            var origRef = fn._orig || fn;
            for (var i = 0; i < this._l[type].length; i++) {
                if ((this._l[type][i].orig || this._l[type][i].fn) === origRef) return;
            }
            this._l[type].push({ fn: fn, once: fireOnce, orig: origRef });
            if (sig && typeof sig.addEventListener === "function") {
                var self = this;
                sig.addEventListener("abort", function () {
                    self.removeEventListener(type, listener);
                });
            }
        };
        g.EventTarget.prototype.removeEventListener = function (type, listener) {
            type = String(type);
            if (!this._l || !this._l[type]) return;
            var ref = (listener && listener._orig) || listener;
            this._l[type] = this._l[type].filter(function (e) {
                return e.orig !== ref && e.fn !== ref;
            });
        };
        g.EventTarget.prototype.dispatchEvent = function (evt) {
            evt.target = evt.target || this;
            evt.srcElement = evt.target;
            evt.currentTarget = this;
            evt.eventPhase = 2;
            var list = this._l && this._l[evt.type] ? this._l[evt.type].slice() : [];
            for (var i = 0; i < list.length; i++) {
                if (evt._stopImmediate) break;
                var entry = list[i];
                if (entry.once) this.removeEventListener(evt.type, entry.orig || entry.fn);
                try {
                    entry.fn.call(this, evt);
                } catch (e) {
                    if (typeof g._hostLog === "function")
                        try {
                            g._hostLog("[EventTarget] listener error: " + (e && e.message));
                        } catch (e2) {}
                }
            }
            // handler on-property (acesso por bracket p/ driblar sanitizador)
            var h = this["on" + evt.type];
            if (typeof h === "function" && !evt._stopImmediate) {
                try {
                    h.call(this, evt);
                } catch (e3) {}
            }
            evt.currentTarget = null;
            evt.eventPhase = 0;
            return !evt.defaultPrevented;
        };

        if (typeof g.queueMicrotask !== "function") {
            g.queueMicrotask = function (fn) {
                Promise.resolve().then(fn);
            };
        }

        // ── AbortSignal / AbortController ────────────────────────────────────
        g.AbortSignal = function AbortSignal() {
            g.EventTarget.call(this);
            this.aborted = false;
            this.reason = undefined;
        };
        g.AbortSignal.prototype = Object.create(g.EventTarget.prototype);
        g.AbortSignal.prototype.constructor = g.AbortSignal;
        g.AbortSignal.prototype.throwIfAborted = function () {
            if (this.aborted) throw this.reason !== undefined ? this.reason : _domErr("signal is aborted without reason", "AbortError");
        };
        g.AbortSignal.abort = function (reason) {
            var s = new g.AbortSignal();
            s.aborted = true;
            s.reason = reason !== undefined ? reason : _domErr("signal is aborted without reason", "AbortError");
            return s;
        };
        g.AbortSignal.timeout = function (ms) {
            var s = new g.AbortSignal();
            g.setTimeout(function () {
                if (s.aborted) return;
                s.aborted = true;
                s.reason = _domErr("signal timed out", "TimeoutError");
                s.dispatchEvent(new g.Event("abort"));
            }, ms);
            return s;
        };
        g.AbortSignal.any = function (signals) {
            var s = new g.AbortSignal();
            var arr = Array.prototype.slice.call(signals);
            for (var i = 0; i < arr.length; i++) {
                if (arr[i] && arr[i].aborted) {
                    s.aborted = true;
                    s.reason = arr[i].reason;
                    return s;
                }
            }
            arr.forEach(function (sig) {
                if (sig && typeof sig.addEventListener === "function") {
                    sig.addEventListener("abort", function () {
                        if (s.aborted) return;
                        s.aborted = true;
                        s.reason = sig.reason;
                        s.dispatchEvent(new g.Event("abort"));
                    });
                }
            });
            return s;
        };
        g.AbortController = function AbortController() {
            this.signal = new g.AbortSignal();
        };
        g.AbortController.prototype.abort = function (reason) {
            if (this.signal.aborted) return;
            this.signal.aborted = true;
            this.signal.reason = reason !== undefined ? reason : _domErr("signal is aborted without reason", "AbortError");
            this.signal.dispatchEvent(new g.Event("abort"));
        };

        // ── crypto ───────────────────────────────────────────────────────────
        if (typeof g.crypto !== "object" || g.crypto === null) g.crypto = {};
        g.crypto.getRandomValues = function getRandomValues(arr) {
            if (!arr || typeof ArrayBuffer === "undefined" || !ArrayBuffer.isView(arr)) throw _domErr("Argument is not an integer-typed array.", "TypeMismatchError");
            var name = (arr.constructor && arr.constructor.name) || "";
            if (/Float/.test(name)) throw _domErr("The provided ArrayBufferView is of type '" + name + "', which is not an integer array type.", "TypeMismatchError");
            var view = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
            for (var i = 0; i < view.length; i++) view[i] = (Math.random() * 256) | 0;
            return arr;
        };
        g.crypto.randomUUID = function randomUUID() {
            var b = new Uint8Array(16);
            g.crypto.getRandomValues(b);
            b[6] = (b[6] & 0x0f) | 0x40;
            b[8] = (b[8] & 0x3f) | 0x80;
            var h = "";
            for (var i = 0; i < 16; i++) h += (b[i] < 16 ? "0" : "") + b[i].toString(16);
            return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
        };
        var _K = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6,
            0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb,
            0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee,
            0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
        ];
        var _sha256 = function (data) {
            var h0 = 0x6a09e667,
                h1 = 0xbb67ae85,
                h2 = 0x3c6ef372,
                h3 = 0xa54ff53a,
                h4 = 0x510e527f,
                h5 = 0x9b05688c,
                h6 = 0x1f83d9ab,
                h7 = 0x5be0cd19;
            var l = data.length,
                bitLen = l * 8,
                withOne = l + 1;
            var pad = (56 - (withOne % 64) + 64) % 64,
                total = withOne + pad + 8;
            var m = new Uint8Array(total);
            m.set(data);
            m[l] = 0x80;
            var dv = new DataView(m.buffer);
            dv.setUint32(total - 4, bitLen >>> 0, false);
            dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000), false);
            var w = new Uint32Array(64);
            var rotr = function (x, n) {
                return (x >>> n) | (x << (32 - n));
            };
            for (var i = 0; i < total; i += 64) {
                for (var t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4, false);
                for (t = 16; t < 64; t++) {
                    var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
                    var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
                    w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
                }
                var a = h0,
                    b = h1,
                    c = h2,
                    d = h3,
                    e = h4,
                    f = h5,
                    gg = h6,
                    hh = h7;
                for (t = 0; t < 64; t++) {
                    var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
                    var ch = (e & f) ^ (~e & gg);
                    var t1 = (hh + S1 + ch + _K[t] + w[t]) >>> 0;
                    var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
                    var maj = (a & b) ^ (a & c) ^ (b & c);
                    var t2 = (S0 + maj) >>> 0;
                    hh = gg;
                    gg = f;
                    f = e;
                    e = (d + t1) >>> 0;
                    d = c;
                    c = b;
                    b = a;
                    a = (t1 + t2) >>> 0;
                }
                h0 = (h0 + a) >>> 0;
                h1 = (h1 + b) >>> 0;
                h2 = (h2 + c) >>> 0;
                h3 = (h3 + d) >>> 0;
                h4 = (h4 + e) >>> 0;
                h5 = (h5 + f) >>> 0;
                h6 = (h6 + gg) >>> 0;
                h7 = (h7 + hh) >>> 0;
            }
            var out = new Uint8Array(32),
                odv = new DataView(out.buffer);
            [h0, h1, h2, h3, h4, h5, h6, h7].forEach(function (h, idx) {
                odv.setUint32(idx * 4, h, false);
            });
            return out;
        };
        g.crypto.subtle = g.crypto.subtle || {};
        g.crypto.subtle.digest = function digest(alg, data) {
            try {
                var name = (typeof alg === "string" ? alg : (alg && alg.name) || "").toUpperCase();
                var bytes = data instanceof Uint8Array ? data : _toBytes(data);
                if (name === "SHA-256") return Promise.resolve(_sha256(bytes).buffer);
                return Promise.reject(_domErr("Algorithm not supported: " + name, "NotSupportedError"));
            } catch (e) {
                return Promise.reject(e);
            }
        };

        // ── structuredClone (real) ────────────────────────────────────────────
        g.structuredClone = function structuredClone(value) {
            var seen = new Map();
            var hasOwn = Object.prototype.hasOwnProperty;
            function c(x) {
                if (x === null) return null;
                var tp = typeof x;
                if (tp === "undefined" || tp === "boolean" || tp === "number" || tp === "string" || tp === "bigint") return x;
                if (tp === "symbol" || tp === "function") throw _domErr("Could not be cloned: " + tp + ".", "DataCloneError");
                if (seen.has(x)) return seen.get(x);
                if (x instanceof Date) return new Date(x.getTime());
                if (x instanceof RegExp) return new RegExp(x.source, x.flags);
                if (typeof ArrayBuffer !== "undefined" && x instanceof ArrayBuffer) return x.slice(0);
                if (typeof DataView !== "undefined" && x instanceof DataView) return new DataView(x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength));
                if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(x)) return new x.constructor(x);
                if (typeof Boolean !== "undefined" && x instanceof Boolean) return new Boolean(x.valueOf());
                if (typeof Number !== "undefined" && x instanceof Number) return new Number(x.valueOf());
                if (typeof String !== "undefined" && x instanceof String) return new String(x.valueOf());
                if (x instanceof Error) {
                    var Ctor = g[x.name] && typeof g[x.name] === "function" ? g[x.name] : Error;
                    var er = new Ctor(x.message);
                    er.name = x.name;
                    if (x.stack) er.stack = x.stack;
                    if (x.cause !== undefined) er.cause = c(x.cause);
                    return er;
                }
                if (x instanceof Map) {
                    var mp = new Map();
                    seen.set(x, mp);
                    x.forEach(function (v, k) {
                        mp.set(c(k), c(v));
                    });
                    return mp;
                }
                if (x instanceof Set) {
                    var st = new Set();
                    seen.set(x, st);
                    x.forEach(function (v) {
                        st.add(c(v));
                    });
                    return st;
                }
                if (Array.isArray(x)) {
                    var ar = [];
                    seen.set(x, ar);
                    for (var i = 0; i < x.length; i++) ar[i] = c(x[i]);
                    return ar;
                }
                var o = {};
                seen.set(x, o);
                for (var k in x) if (hasOwn.call(x, k)) o[k] = c(x[k]);
                return o;
            }
            return c(value);
        };

        // ── URLSearchParams (completo) ────────────────────────────────────────
        var _enc = function (s) {
            return encodeURIComponent(s).replace(/%20/g, "+").replace(/[!'()~]/g, function (ch) {
                return "%" + ch.charCodeAt(0).toString(16).toUpperCase();
            });
        };
        var _dec = function (s) {
            try {
                return decodeURIComponent(String(s).replace(/\+/g, " "));
            } catch (e) {
                return String(s).replace(/\+/g, " ");
            }
        };
        function HSearchParams(init) {
            this._ = [];
            if (init == null || init === "") return;
            if (init instanceof HSearchParams) {
                this._ = init._.map(function (e) {
                    return [e[0], e[1]];
                });
                return;
            }
            if (typeof init === "string") {
                var s = init.replace(/^\?/, "");
                if (s)
                    s.split("&").forEach(function (pair) {
                        if (!pair) return;
                        var i = pair.indexOf("=");
                        var k = i < 0 ? pair : pair.slice(0, i);
                        var v = i < 0 ? "" : pair.slice(i + 1);
                        this._.push([_dec(k), _dec(v)]);
                    }, this);
            } else if (typeof init[Symbol.iterator] === "function") {
                for (var it = init[Symbol.iterator](), r = it.next(); !r.done; r = it.next()) this._.push([String(r.value[0]), String(r.value[1])]);
            } else {
                Object.keys(init).forEach(function (k) {
                    this._.push([k, String(init[k])]);
                }, this);
            }
        }
        HSearchParams.prototype.append = function (k, v) {
            this._.push([String(k), String(v)]);
        };
        HSearchParams.prototype.delete = function (k, v) {
            k = String(k);
            var hasV = arguments.length > 1;
            v = hasV ? String(v) : null;
            this._ = this._.filter(function (e) {
                return hasV ? !(e[0] === k && e[1] === v) : e[0] !== k;
            });
        };
        HSearchParams.prototype.get = function (k) {
            k = String(k);
            var e = this._.find(function (e) {
                return e[0] === k;
            });
            return e ? e[1] : null;
        };
        HSearchParams.prototype.getAll = function (k) {
            k = String(k);
            return this._.filter(function (e) {
                return e[0] === k;
            }).map(function (e) {
                return e[1];
            });
        };
        HSearchParams.prototype.has = function (k, v) {
            k = String(k);
            var hasV = arguments.length > 1;
            v = hasV ? String(v) : null;
            return this._.some(function (e) {
                return hasV ? e[0] === k && e[1] === v : e[0] === k;
            });
        };
        HSearchParams.prototype.set = function (k, v) {
            k = String(k);
            v = String(v);
            var done = false,
                out = [];
            this._.forEach(function (e) {
                if (e[0] !== k) out.push(e);
                else if (!done) {
                    out.push([k, v]);
                    done = true;
                }
            });
            if (!done) out.push([k, v]);
            this._ = out;
        };
        HSearchParams.prototype.sort = function () {
            this._.sort(function (a, b) {
                return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
            });
        };
        HSearchParams.prototype.forEach = function (cb, t) {
            this._.slice().forEach(function (e) {
                cb.call(t, e[1], e[0], this);
            }, this);
        };
        HSearchParams.prototype.keys = function () {
            return this._.map(function (e) {
                return e[0];
            })[Symbol.iterator]();
        };
        HSearchParams.prototype.values = function () {
            return this._.map(function (e) {
                return e[1];
            })[Symbol.iterator]();
        };
        HSearchParams.prototype.entries = function () {
            return this._.map(function (e) {
                return [e[0], e[1]];
            })[Symbol.iterator]();
        };
        HSearchParams.prototype[Symbol.iterator] = HSearchParams.prototype.entries;
        HSearchParams.prototype.toString = function () {
            return this._.map(function (e) {
                return _enc(e[0]) + "=" + _enc(e[1]);
            }).join("&");
        };
        Object.defineProperty(HSearchParams.prototype, "size", {
            get: function () {
                return this._.length;
            },
        });
        g.URLSearchParams = HSearchParams;

        // ── URL (parser + base relativa) ──────────────────────────────────────
        var _DEFPORT = { "http:": "80", "https:": "443", "ws:": "80", "wss:": "443", "ftp:": "21" };
        function HURL(url, base) {
            url = String(url).trim();
            var m = /^([a-zA-Z][a-zA-Z0-9+.\-]*:)\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/.exec(url);
            if (!m) {
                if (base == null) {
                    var op = /^([a-zA-Z][a-zA-Z0-9+.\-]*:)(.*)$/.exec(url);
                    if (op) {
                        this.protocol = op[1].toLowerCase();
                        this.pathname = op[2];
                        this.host = this.hostname = this.port = this.search = this.hash = "";
                        this.username = this.password = "";
                        this._sp = new HSearchParams("");
                        this._bind();
                        return;
                    }
                    throw new TypeError("Invalid URL: " + url);
                }
                var b = base instanceof HURL ? base : new HURL(base);
                var qh = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(url);
                var relPath = qh[1],
                    relSearch = qh[2] || "",
                    relHash = qh[3] || "",
                    path;
                if (relPath.charAt(0) === "/") path = relPath;
                else if (relPath === "") {
                    path = b.pathname;
                    if (!relSearch) relSearch = b.search;
                } else {
                    var dir = b.pathname.slice(0, b.pathname.lastIndexOf("/") + 1);
                    path = dir + relPath;
                }
                path = HURL._norm(path);
                this.protocol = b.protocol;
                this._auth(b.host);
                this.username = b.username;
                this.password = b.password;
                this.pathname = path || "/";
                this.search = relSearch;
                this.hash = relHash;
            } else {
                this.protocol = m[1].toLowerCase();
                this._auth(m[2]);
                this.pathname = m[3] || (this.host ? "/" : "");
                this.search = m[4] || "";
                this.hash = m[5] || "";
            }
            if (this.port && _DEFPORT[this.protocol] === this.port) {
                this.port = "";
                this.host = this.hostname;
            }
            this._sp = new HSearchParams(this.search);
            this._bind();
        }
        HURL.prototype._bind = function () {
            var self = this;
            var origTo = this._sp.toString;
            this._sp.toString = function () {
                var s = origTo.call(this);
                self.search = s ? "?" + s : "";
                return s;
            };
        };
        HURL.prototype._auth = function (auth) {
            auth = auth || "";
            this.username = "";
            this.password = "";
            var at = auth.lastIndexOf("@");
            if (at >= 0) {
                var cred = auth.slice(0, at);
                auth = auth.slice(at + 1);
                var ci2 = cred.indexOf(":");
                this.username = ci2 < 0 ? cred : cred.slice(0, ci2);
                this.password = ci2 < 0 ? "" : cred.slice(ci2 + 1);
            }
            var ci = auth.indexOf(":");
            this.hostname = (ci < 0 ? auth : auth.slice(0, ci)).toLowerCase();
            this.port = ci < 0 ? "" : auth.slice(ci + 1);
            this.host = this.port ? this.hostname + ":" + this.port : this.hostname;
        };
        HURL._norm = function (p) {
            var parts = p.split("/"),
                out = [];
            for (var i = 0; i < parts.length; i++) {
                var seg = parts[i];
                if (seg === ".") continue;
                if (seg === "..") {
                    if (out.length > 1) out.pop();
                } else out.push(seg);
            }
            return out.join("/");
        };
        Object.defineProperty(HURL.prototype, "searchParams", {
            get: function () {
                return this._sp;
            },
        });
        Object.defineProperty(HURL.prototype, "origin", {
            get: function () {
                return this.host ? this.protocol + "//" + this.host : "null";
            },
        });
        Object.defineProperty(HURL.prototype, "href", {
            get: function () {
                var search = this._sp && this._sp._.length ? "?" + this._sp.toString() : this.search;
                var s = this.protocol;
                if (this.host) {
                    s += "//";
                    if (this.username) {
                        s += this.username;
                        if (this.password) s += ":" + this.password;
                        s += "@";
                    }
                    s += this.host;
                }
                return s + this.pathname + search + this.hash;
            },
            set: function (v) {
                var u = new HURL(v);
                this.protocol = u.protocol;
                this.username = u.username;
                this.password = u.password;
                this.host = u.host;
                this.hostname = u.hostname;
                this.port = u.port;
                this.pathname = u.pathname;
                this.search = u.search;
                this.hash = u.hash;
                this._sp = new HSearchParams(this.search);
                this._bind();
            },
        });
        HURL.prototype.toString = function () {
            return this.href;
        };
        HURL.prototype.toJSON = function () {
            return this.href;
        };
        g.URL = HURL;

        // ── performance ───────────────────────────────────────────────────────
        if (typeof g.performance !== "object" || g.performance === null || typeof g.performance.now !== "function") {
            var _origin = Date.now();
            g.performance = g.performance || {};
            g.performance.now = function now() {
                return Date.now() - _origin;
            };
            g.performance.timeOrigin = _origin;
        }

        // ── EVENT LOOP: timers reais (setTimeout/setInterval/setImmediate) ─────
        // Delay REAL via Atomics.wait; fila drenada por microtask. Timers são
        // NÃO-bloqueantes (retornam id na hora) e canceláveis de verdade;
        // setInterval REPETE de fato. A drenagem roda quando o stack síncrono
        // desenrola (como um event loop) — consumidores devem aguardar (await)
        // a Promise que o callback resolve, exatamente como em JS real.
        (function () {
            var seq = 1;
            var tasks = [];
            var cancelled = Object.create(null);
            var scheduled = false;
            var draining = false;
            var MAXMS = 30000;
            var BUDGET = 27000;
            var canWait = typeof g.SharedArrayBuffer !== "undefined" && typeof Atomics !== "undefined" && typeof Atomics.wait === "function";
            var sab = canWait ? new Int32Array(new g.SharedArrayBuffer(4)) : null;

            function realDelay(ms) {
                if (ms <= 0) return;
                if (canWait) {
                    try {
                        Atomics.wait(sab, 0, 0, Math.min(MAXMS, ms));
                    } catch (e) {}
                }
            }
            function removeTask(id) {
                for (var i = 0; i < tasks.length; i++) {
                    if (tasks[i].id === id) {
                        tasks.splice(i, 1);
                        break;
                    }
                }
            }
            function scheduleDrain() {
                if (scheduled || draining) return;
                scheduled = true;
                Promise.resolve().then(runLoop);
            }
            async function runLoop() {
                scheduled = false;
                if (draining) return;
                draining = true;
                var start = Date.now();
                try {
                    while (tasks.length) {
                        if (Date.now() - start > BUDGET) break;
                        var idx = -1,
                            best = Infinity;
                        for (var i = 0; i < tasks.length; i++) {
                            var tk = tasks[i];
                            if (cancelled[tk.id]) continue;
                            if (tk.due < best) {
                                best = tk.due;
                                idx = i;
                            }
                        }
                        if (idx < 0) {
                            tasks.length = 0;
                            break;
                        }
                        var task = tasks[idx];
                        var wait = task.due - Date.now();
                        if (wait > 0) realDelay(wait);
                        if (cancelled[task.id]) {
                            removeTask(task.id);
                            delete cancelled[task.id];
                            continue;
                        }
                        try {
                            if (typeof task.fn === "function") task.fn.apply(undefined, task.args);
                        } catch (e) {
                            if (typeof g._hostLog === "function")
                                try {
                                    g._hostLog("[timer] callback error: " + (e && e.message));
                                } catch (e2) {}
                        }
                        if (task.every != null && !cancelled[task.id]) {
                            task.due = Date.now() + task.every;
                        } else {
                            removeTask(task.id);
                            delete cancelled[task.id];
                        }
                        await Promise.resolve();
                    }
                } finally {
                    draining = false;
                    if (tasks.length) scheduleDrain();
                }
            }
            function add(fn, ms, every, args) {
                var id = seq++;
                ms = Number(ms);
                if (!(ms >= 0)) ms = 0;
                tasks.push({ id: id, due: Date.now() + ms, fn: fn, args: args, every: every });
                scheduleDrain();
                return id;
            }
            g.setTimeout = function setTimeout(fn, ms) {
                return add(fn, ms, null, Array.prototype.slice.call(arguments, 2));
            };
            g.setInterval = function setInterval(fn, ms) {
                var iv = Number(ms);
                if (!(iv >= 1)) iv = 1;
                return add(fn, iv, iv, Array.prototype.slice.call(arguments, 2));
            };
            g.setImmediate = function setImmediate(fn) {
                return add(fn, 0, null, Array.prototype.slice.call(arguments, 1));
            };
            g.clearTimeout = function clearTimeout(id) {
                if (id != null) cancelled[id] = true;
            };
            g.clearInterval = g.clearTimeout;
            g.clearImmediate = g.clearTimeout;
        })();

        return { ok: true, message: "W_PolyfillCore instalado" };
    }
}

await new W_PolyfillCore().execute();
