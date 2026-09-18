/**
 * Global string primitives. Zero domain knowledge, zero I/O, zero state — the
 * bottom of the utils pyramid. Anything format- or domain-aware belongs in
 * `utils/formats`, not here.
 */

/** Keeps only the digits of a value. */
export const toDigits = (value: unknown): string => String(value ?? '').replace(/\D/g, '');

/**
 * The first whitespace-separated token of a full name (e.g. `"Ana Paula Silva"` →
 * `"Ana"`). Falls back to the trimmed input when there is no separator. Pure string
 * op — the campaign expression evaluator cannot do this, so it is pre-computed here.
 */
export const firstName = (fullName: unknown): string => {
    const trimmed = String(fullName ?? '').trim();
    return trimmed.split(/\s+/)[0] || trimmed;
};

/** Standard 32-bit FNV offset basis. */
const FNV_OFFSET_BASIS = 2166136261;

/** A second, distinct offset basis so two FNV-1a passes over one input diverge. */
const FNV_SECOND_OFFSET_BASIS = 0x9e3779b9;

/** 32-bit FNV prime. */
const FNV_PRIME = 16777619;

/** Hex digits of one 32-bit hash. */
const HEX_DIGITS_PER_32_BITS = 8;

/** Unsigned 32-bit FNV-1a of a string, starting from the given offset basis. */
const fnv1a32 = (text: string, offsetBasis: number): number => {
    let hash = offsetBasis;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, FNV_PRIME);
    }
    return hash >>> 0;
};

/**
 * Deterministic 32-bit FNV-1a hash of a value's string form. Stable across runs and
 * isolate-safe (no `Math.random`, no state) — the seam that lets `aleatorio` owner
 * distribution be reproducible: the same phone always maps to the same bucket.
 */
export const hashString = (value: unknown): number => fnv1a32(String(value ?? ''), FNV_OFFSET_BASIS);

/**
 * Deterministic 64-bit fingerprint of a string as 16 lowercase hex digits: two FNV-1a
 * passes with distinct offset bases, 8 hex digits each. Wide enough that accidental
 * collisions between dispatch audiences are negligible.
 */
export const hash64Hex = (value: string): string => [FNV_OFFSET_BASIS, FNV_SECOND_OFFSET_BASIS]
    .map((offsetBasis) => fnv1a32(value, offsetBasis).toString(16).padStart(HEX_DIGITS_PER_32_BITS, '0'))
    .join('');

/** Trims a string and collapses every inner whitespace run into one space. */
export const collapseWhitespace = (value: string): string => value.trim().replace(/\s+/g, ' ');

/** Capitalizes one word in pt-BR: first letter upper-cased, the rest lower-cased (`'ÁLVARO'` → `'Álvaro'`). */
export const capitalizeWord = (word: string): string => {
    const lowerCased = word.toLocaleLowerCase('pt-BR');
    return lowerCased.charAt(0).toLocaleUpperCase('pt-BR') + lowerCased.slice(1);
};

/** Capitalizes every word of a text, keeping the whitespace between them (`'ANA  PAULA'` → `'Ana  Paula'`). */
export const capitalizeWords = (text: string): string => text
    .split(/(\s+)/)
    .map((part) => (part.trim() === '' ? part : capitalizeWord(part)))
    .join('');
