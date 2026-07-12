/**
 * @class W_PolyfillBuffer
 * @description Buffer fiel à spec do Node (subclasse real de Uint8Array). O host
 * injeta um BufferShim QUEBRADO (ignora base64/hex, sem concat/read/write/etc),
 * por isso force-replace incondicional. Depende de atob/btoa/TextEncoder/
 * TextDecoder do W_PolyfillCore. Implementa: from(string,enc|array|arraybuffer),
 * toString(utf8/base64/base64url/hex/latin1/ascii/utf16le), write, slice(compartilha
 * memória), concat, alloc/allocUnsafe, fill, copy, equals, compare (inst+estática),
 * indexOf/lastIndexOf/includes, byteLength, toJSON e toda a familia read/write
 * de inteiros/BigInt/float. IMPORTANTE: nenhum identificador comeca com "on"+letras
 * seguido de "=" (armadilha do sanitizador anti-XSS do sandbox).
 */
class W_PolyfillBuffer {
    constructor() {
        this.name = "W_PolyfillBuffer";
    }
    async execute() {
        var g = typeof globalThis !== "undefined" ? globalThis : global;

        // ── base64 (via atob/btoa do Core; suporta base64url) ────────────────
        function b64encode(bytes) {
            var s = "";
            for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
            return g.btoa(s);
        }
        function b64decode(str) {
            var norm = String(str).replace(/-/g, "+").replace(/_/g, "/");
            var bin = g.atob(norm);
            var a = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
            return a;
        }
        function hexDecode(str) {
            str = String(str);
            var len = str.length >>> 1;
            var out = new Uint8Array(len);
            var count = 0;
            for (var i = 0; i < len; i++) {
                var byte = parseInt(str.substr(i * 2, 2), 16);
                if (isNaN(byte)) break;
                out[count++] = byte;
            }
            return count === len ? out : out.subarray(0, count);
        }

        // ── normalização de encoding ─────────────────────────────────────────
        function normEnc(enc) {
            if (enc == null || enc === "") return "utf8";
            enc = String(enc).toLowerCase();
            if (enc === "utf-8" || enc === "utf8") return "utf8";
            if (enc === "ucs2" || enc === "ucs-2" || enc === "utf16le" || enc === "utf-16le") return "utf16le";
            if (enc === "latin1" || enc === "binary") return "latin1";
            if (enc === "base64url") return "base64url";
            if (enc === "base64" || enc === "hex" || enc === "ascii") return enc;
            throw new TypeError("Unknown encoding: " + enc);
        }
        var _ENCS = { utf8: 1, "utf-8": 1, ucs2: 1, "ucs-2": 1, utf16le: 1, "utf-16le": 1, latin1: 1, binary: 1, base64: 1, base64url: 1, hex: 1, ascii: 1 };

        // ── string -> bytes ──────────────────────────────────────────────────
        function strToBytes(str, enc) {
            str = String(str);
            enc = normEnc(enc);
            var i, a;
            if (enc === "utf8") return new g.TextEncoder().encode(str);
            if (enc === "base64" || enc === "base64url") return b64decode(str);
            if (enc === "hex") return hexDecode(str);
            if (enc === "latin1") {
                a = new Uint8Array(str.length);
                for (i = 0; i < str.length; i++) a[i] = str.charCodeAt(i) & 0xff;
                return a;
            }
            if (enc === "ascii") {
                a = new Uint8Array(str.length);
                for (i = 0; i < str.length; i++) a[i] = str.charCodeAt(i) & 0x7f;
                return a;
            }
            // utf16le
            a = new Uint8Array(str.length * 2);
            var dv = new DataView(a.buffer);
            for (i = 0; i < str.length; i++) dv.setUint16(i * 2, str.charCodeAt(i), true);
            return a;
        }

        // ── bytes -> string ──────────────────────────────────────────────────
        function bytesToStr(bytes, enc) {
            enc = normEnc(enc);
            var i, s;
            if (enc === "utf8") return new g.TextDecoder().decode(bytes);
            if (enc === "base64") return b64encode(bytes);
            if (enc === "base64url") return b64encode(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
            if (enc === "hex") {
                s = "";
                for (i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
                return s;
            }
            if (enc === "latin1") {
                s = "";
                for (i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
                return s;
            }
            if (enc === "ascii") {
                s = "";
                for (i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i] & 0x7f);
                return s;
            }
            // utf16le
            s = "";
            var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            var n = bytes.length >>> 1;
            for (i = 0; i < n; i++) s += String.fromCharCode(dv.getUint16(i * 2, true));
            return s;
        }

        function view(buf) {
            return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        }

        function bidx(buf, value, byteOffset, encoding, forward) {
            var len = buf.length;
            if (typeof byteOffset === "string") {
                encoding = byteOffset;
                byteOffset = undefined;
            }
            var off;
            if (byteOffset === undefined || byteOffset !== byteOffset) off = forward ? 0 : len - 1;
            else {
                off = byteOffset | 0;
                if (off < 0) off = len + off;
            }
            var i, j, ok;
            if (typeof value === "number") {
                var target = value & 0xff;
                if (forward) {
                    if (off < 0) off = 0;
                    for (i = off; i < len; i++) if (buf[i] === target) return i;
                    return -1;
                }
                if (off >= len) off = len - 1;
                for (i = off; i >= 0; i--) if (buf[i] === target) return i;
                return -1;
            }
            var needle;
            if (typeof value === "string") needle = strToBytes(value, encoding);
            else if (value instanceof Uint8Array) needle = value;
            else throw new TypeError("value must be string, number or Uint8Array");
            var nl = needle.length;
            if (nl === 0) return forward ? (off < 0 ? 0 : off > len ? len : off) : off > len ? len : off < 0 ? -1 : off;
            if (forward) {
                if (off < 0) off = 0;
                for (i = off; i + nl <= len; i++) {
                    ok = true;
                    for (j = 0; j < nl; j++) if (buf[i + j] !== needle[j]) { ok = false; break; }
                    if (ok) return i;
                }
                return -1;
            }
            if (off > len - nl) off = len - nl;
            for (i = off; i >= 0; i--) {
                ok = true;
                for (j = 0; j < nl; j++) if (buf[i + j] !== needle[j]) { ok = false; break; }
                if (ok) return i;
            }
            return -1;
        }

        class HBuffer extends Uint8Array {
            static from(input, a, b) {
                if (typeof input === "string") return new HBuffer(strToBytes(input, a));
                if (input instanceof ArrayBuffer || (typeof SharedArrayBuffer !== "undefined" && input instanceof SharedArrayBuffer)) {
                    var off = a == null ? 0 : a >>> 0;
                    var len = b == null ? input.byteLength - off : b >>> 0;
                    return new HBuffer(input, off, len);
                }
                if (input && typeof input === "object" && input.type === "Buffer" && Array.isArray(input.data)) return new HBuffer(input.data);
                if (ArrayBuffer.isView(input) || Array.isArray(input) || (input && typeof input.length === "number")) return new HBuffer(input);
                throw new TypeError("The first argument must be of type string, Buffer, ArrayBuffer, Array, or Array-like Object.");
            }
            static of() {
                return new HBuffer(Array.prototype.slice.call(arguments));
            }
            static alloc(size, fill, enc) {
                var buf = new HBuffer(size >>> 0);
                if (fill !== undefined && fill !== 0 && fill !== "\0") buf.fill(fill, 0, buf.length, enc);
                return buf;
            }
            static allocUnsafe(size) {
                return new HBuffer(size >>> 0);
            }
            static allocUnsafeSlow(size) {
                return new HBuffer(size >>> 0);
            }
            static concat(list, total) {
                if (!Array.isArray(list)) throw new TypeError("list argument must be an Array of Buffers");
                if (total === undefined) {
                    total = 0;
                    for (var i = 0; i < list.length; i++) total += list[i].length;
                }
                total = total >>> 0;
                var out = new HBuffer(total),
                    off = 0;
                for (var j = 0; j < list.length && off < total; j++) {
                    var item = list[j];
                    var n = Math.min(item.length, total - off);
                    out.set(item.subarray ? item.subarray(0, n) : new Uint8Array(item).subarray(0, n), off);
                    off += n;
                }
                return out;
            }
            static isBuffer(x) {
                return x instanceof HBuffer;
            }
            static isEncoding(enc) {
                return typeof enc === "string" && _ENCS[enc.toLowerCase()] === 1;
            }
            static compare(a, b) {
                if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) throw new TypeError("Arguments must be Buffers");
                var len = Math.min(a.length, b.length);
                for (var i = 0; i < len; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
                return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
            }
            static byteLength(input, enc) {
                if (typeof input !== "string") {
                    if (input instanceof ArrayBuffer) return input.byteLength;
                    if (ArrayBuffer.isView(input)) return input.byteLength;
                    input = String(input);
                }
                enc = normEnc(enc);
                if (enc === "utf8") return new g.TextEncoder().encode(input).length;
                if (enc === "latin1" || enc === "ascii") return input.length;
                if (enc === "hex") return input.length >>> 1;
                if (enc === "utf16le") return input.length * 2;
                return b64decode(input).length;
            }

            toString(enc, start, end) {
                var len = this.length;
                start = start === undefined ? 0 : start | 0;
                if (start < 0) start = 0;
                if (start > len) start = len;
                end = end === undefined ? len : end | 0;
                if (end < 0) end = 0;
                if (end > len) end = len;
                if (end <= start) return "";
                return bytesToStr(this.subarray(start, end), enc);
            }

            toJSON() {
                return { type: "Buffer", data: Array.prototype.slice.call(this) };
            }

            write(string, offset, length, encoding) {
                if (offset === undefined) {
                    offset = 0;
                    length = this.length;
                    encoding = "utf8";
                } else if (typeof offset === "string") {
                    encoding = offset;
                    offset = 0;
                    length = this.length;
                } else if (typeof length === "string") {
                    encoding = length;
                    length = this.length - (offset | 0);
                }
                offset = offset >>> 0;
                var remaining = this.length - offset;
                if (length === undefined || length > remaining) length = remaining;
                var bytes = strToBytes(string, encoding);
                var n = Math.min(bytes.length, length);
                for (var i = 0; i < n; i++) this[offset + i] = bytes[i];
                return n;
            }

            fill(value, offset, end, encoding) {
                if (typeof offset === "string") {
                    encoding = offset;
                    offset = 0;
                    end = this.length;
                } else if (typeof end === "string") {
                    encoding = end;
                    end = this.length;
                }
                offset = offset === undefined ? 0 : offset | 0;
                end = end === undefined ? this.length : end | 0;
                if (offset < 0) offset = 0;
                if (end > this.length) end = this.length;
                var i, k;
                if (typeof value === "number") {
                    for (i = offset; i < end; i++) this[i] = value & 0xff;
                    return this;
                }
                var src;
                if (typeof value === "string") src = strToBytes(value, encoding);
                else if (value instanceof Uint8Array) src = value;
                else {
                    for (i = offset; i < end; i++) this[i] = 0;
                    return this;
                }
                if (src.length === 0) {
                    for (i = offset; i < end; i++) this[i] = 0;
                    return this;
                }
                for (i = offset, k = 0; i < end; i++, k++) this[i] = src[k % src.length];
                return this;
            }

            slice(start, end) {
                return this.subarray(start, end);
            }

            copy(target, targetStart, sourceStart, sourceEnd) {
                targetStart = targetStart === undefined ? 0 : targetStart >>> 0;
                sourceStart = sourceStart === undefined ? 0 : sourceStart >>> 0;
                sourceEnd = sourceEnd === undefined ? this.length : sourceEnd >>> 0;
                if (sourceEnd > this.length) sourceEnd = this.length;
                if (sourceStart > sourceEnd) sourceStart = sourceEnd;
                var n = Math.min(sourceEnd - sourceStart, target.length - targetStart);
                if (n <= 0) return 0;
                target.set(this.subarray(sourceStart, sourceStart + n), targetStart);
                return n;
            }

            equals(other) {
                if (!(other instanceof Uint8Array)) throw new TypeError("argument must be a Buffer or Uint8Array");
                if (other === this) return true;
                if (this.length !== other.length) return false;
                for (var i = 0; i < this.length; i++) if (this[i] !== other[i]) return false;
                return true;
            }

            compare(target, ts, te, ss, se) {
                if (!(target instanceof Uint8Array)) throw new TypeError("argument must be a Buffer or Uint8Array");
                ts = ts === undefined ? 0 : ts >>> 0;
                te = te === undefined ? target.length : te >>> 0;
                ss = ss === undefined ? 0 : ss >>> 0;
                se = se === undefined ? this.length : se >>> 0;
                var a = this.subarray(ss, se),
                    b = target.subarray(ts, te);
                var len = Math.min(a.length, b.length);
                for (var i = 0; i < len; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
                return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
            }

            indexOf(value, byteOffset, encoding) {
                return bidx(this, value, byteOffset, encoding, true);
            }
            lastIndexOf(value, byteOffset, encoding) {
                return bidx(this, value, byteOffset, encoding, false);
            }
            includes(value, byteOffset, encoding) {
                return bidx(this, value, byteOffset, encoding, true) !== -1;
            }

            // ── leituras de inteiros sem sinal ──────────────────────────────
            readUInt8(o) {
                return view(this).getUint8(o >>> 0);
            }
            readUInt16LE(o) {
                return view(this).getUint16(o >>> 0, true);
            }
            readUInt16BE(o) {
                return view(this).getUint16(o >>> 0, false);
            }
            readUInt32LE(o) {
                return view(this).getUint32(o >>> 0, true);
            }
            readUInt32BE(o) {
                return view(this).getUint32(o >>> 0, false);
            }
            readUIntLE(o, bl) {
                o = o >>> 0;
                bl = bl >>> 0;
                var v = 0,
                    mul = 1;
                for (var i = 0; i < bl; i++) {
                    v += this[o + i] * mul;
                    mul *= 0x100;
                }
                return v;
            }
            readUIntBE(o, bl) {
                o = o >>> 0;
                bl = bl >>> 0;
                var v = 0;
                for (var i = 0; i < bl; i++) v = v * 0x100 + this[o + i];
                return v;
            }
            // ── leituras de inteiros com sinal ──────────────────────────────
            readInt8(o) {
                return view(this).getInt8(o >>> 0);
            }
            readInt16LE(o) {
                return view(this).getInt16(o >>> 0, true);
            }
            readInt16BE(o) {
                return view(this).getInt16(o >>> 0, false);
            }
            readInt32LE(o) {
                return view(this).getInt32(o >>> 0, true);
            }
            readInt32BE(o) {
                return view(this).getInt32(o >>> 0, false);
            }
            readIntLE(o, bl) {
                var v = this.readUIntLE(o, bl);
                var max = Math.pow(2, 8 * bl);
                return v >= max / 2 ? v - max : v;
            }
            readIntBE(o, bl) {
                var v = this.readUIntBE(o, bl);
                var max = Math.pow(2, 8 * bl);
                return v >= max / 2 ? v - max : v;
            }
            // ── BigInt 64 bits ──────────────────────────────────────────────
            readBigUInt64LE(o) {
                return view(this).getBigUint64(o >>> 0, true);
            }
            readBigUInt64BE(o) {
                return view(this).getBigUint64(o >>> 0, false);
            }
            readBigInt64LE(o) {
                return view(this).getBigInt64(o >>> 0, true);
            }
            readBigInt64BE(o) {
                return view(this).getBigInt64(o >>> 0, false);
            }
            // ── ponto flutuante ─────────────────────────────────────────────
            readFloatLE(o) {
                return view(this).getFloat32(o >>> 0, true);
            }
            readFloatBE(o) {
                return view(this).getFloat32(o >>> 0, false);
            }
            readDoubleLE(o) {
                return view(this).getFloat64(o >>> 0, true);
            }
            readDoubleBE(o) {
                return view(this).getFloat64(o >>> 0, false);
            }

            // ── escritas de inteiros sem sinal ──────────────────────────────
            writeUInt8(v, o) {
                o = o >>> 0;
                view(this).setUint8(o, v & 0xff);
                return o + 1;
            }
            writeUInt16LE(v, o) {
                o = o >>> 0;
                view(this).setUint16(o, v & 0xffff, true);
                return o + 2;
            }
            writeUInt16BE(v, o) {
                o = o >>> 0;
                view(this).setUint16(o, v & 0xffff, false);
                return o + 2;
            }
            writeUInt32LE(v, o) {
                o = o >>> 0;
                view(this).setUint32(o, v >>> 0, true);
                return o + 4;
            }
            writeUInt32BE(v, o) {
                o = o >>> 0;
                view(this).setUint32(o, v >>> 0, false);
                return o + 4;
            }
            writeUIntLE(v, o, bl) {
                o = o >>> 0;
                bl = bl >>> 0;
                var val = v;
                for (var i = 0; i < bl; i++) {
                    this[o + i] = val & 0xff;
                    val = Math.floor(val / 0x100);
                }
                return o + bl;
            }
            writeUIntBE(v, o, bl) {
                o = o >>> 0;
                bl = bl >>> 0;
                var val = v;
                for (var i = bl - 1; i >= 0; i--) {
                    this[o + i] = val & 0xff;
                    val = Math.floor(val / 0x100);
                }
                return o + bl;
            }
            // ── escritas de inteiros com sinal ──────────────────────────────
            writeInt8(v, o) {
                o = o >>> 0;
                view(this).setInt8(o, v);
                return o + 1;
            }
            writeInt16LE(v, o) {
                o = o >>> 0;
                view(this).setInt16(o, v, true);
                return o + 2;
            }
            writeInt16BE(v, o) {
                o = o >>> 0;
                view(this).setInt16(o, v, false);
                return o + 2;
            }
            writeInt32LE(v, o) {
                o = o >>> 0;
                view(this).setInt32(o, v, true);
                return o + 4;
            }
            writeInt32BE(v, o) {
                o = o >>> 0;
                view(this).setInt32(o, v, false);
                return o + 4;
            }
            writeIntLE(v, o, bl) {
                o = o >>> 0;
                bl = bl >>> 0;
                var val = v < 0 ? v + Math.pow(2, 8 * bl) : v;
                for (var i = 0; i < bl; i++) {
                    this[o + i] = val & 0xff;
                    val = Math.floor(val / 0x100);
                }
                return o + bl;
            }
            writeIntBE(v, o, bl) {
                o = o >>> 0;
                bl = bl >>> 0;
                var val = v < 0 ? v + Math.pow(2, 8 * bl) : v;
                for (var i = bl - 1; i >= 0; i--) {
                    this[o + i] = val & 0xff;
                    val = Math.floor(val / 0x100);
                }
                return o + bl;
            }
            // ── BigInt 64 bits ──────────────────────────────────────────────
            writeBigUInt64LE(v, o) {
                o = o >>> 0;
                view(this).setBigUint64(o, BigInt(v), true);
                return o + 8;
            }
            writeBigUInt64BE(v, o) {
                o = o >>> 0;
                view(this).setBigUint64(o, BigInt(v), false);
                return o + 8;
            }
            writeBigInt64LE(v, o) {
                o = o >>> 0;
                view(this).setBigInt64(o, BigInt(v), true);
                return o + 8;
            }
            writeBigInt64BE(v, o) {
                o = o >>> 0;
                view(this).setBigInt64(o, BigInt(v), false);
                return o + 8;
            }
            // ── ponto flutuante ─────────────────────────────────────────────
            writeFloatLE(v, o) {
                o = o >>> 0;
                view(this).setFloat32(o, v, true);
                return o + 4;
            }
            writeFloatBE(v, o) {
                o = o >>> 0;
                view(this).setFloat32(o, v, false);
                return o + 4;
            }
            writeDoubleLE(v, o) {
                o = o >>> 0;
                view(this).setFloat64(o, v, true);
                return o + 8;
            }
            writeDoubleBE(v, o) {
                o = o >>> 0;
                view(this).setFloat64(o, v, false);
                return o + 8;
            }

            // ── swaps ───────────────────────────────────────────────────────
            swap16() {
                if (this.length % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
                for (var i = 0; i < this.length; i += 2) {
                    var t = this[i];
                    this[i] = this[i + 1];
                    this[i + 1] = t;
                }
                return this;
            }
            swap32() {
                if (this.length % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
                for (var i = 0; i < this.length; i += 4) {
                    var a = this[i],
                        b = this[i + 1];
                    this[i] = this[i + 3];
                    this[i + 1] = this[i + 2];
                    this[i + 2] = b;
                    this[i + 3] = a;
                }
                return this;
            }
        }

        // ── aliases lowercase "Uint" que o Node também expõe ─────────────────
        var P = HBuffer.prototype;
        P.readUintLE = P.readUIntLE;
        P.readUintBE = P.readUIntBE;
        P.writeUintLE = P.writeUIntLE;
        P.writeUintBE = P.writeUIntBE;
        P.readBigUint64LE = P.readBigUInt64LE;
        P.readBigUint64BE = P.readBigUInt64BE;
        P.writeBigUint64LE = P.writeBigUInt64LE;
        P.writeBigUint64BE = P.writeBigUInt64BE;
        P.readUint8 = P.readUInt8;
        P.readUint16LE = P.readUInt16LE;
        P.readUint16BE = P.readUInt16BE;
        P.readUint32LE = P.readUInt32LE;
        P.readUint32BE = P.readUInt32BE;
        P.writeUint8 = P.writeUInt8;
        P.writeUint16LE = P.writeUInt16LE;
        P.writeUint16BE = P.writeUInt16BE;
        P.writeUint32LE = P.writeUInt32LE;
        P.writeUint32BE = P.writeUInt32BE;

        g.Buffer = HBuffer; // force-replace do shim quebrado do host

        return { ok: true, message: "W_PolyfillBuffer instalado" };
    }
}

await new W_PolyfillBuffer().execute();
