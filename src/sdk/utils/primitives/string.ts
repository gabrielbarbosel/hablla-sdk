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

/**
 * Deterministic 32-bit FNV-1a hash of a value's string form. Stable across runs and
 * isolate-safe (no `Math.random`, no state) — the seam that lets `aleatorio` owner
 * distribution be reproducible: the same phone always maps to the same bucket.
 */
export const hashString = (value: unknown): number => {
    const str = String(value ?? '');
    let hash = 2166136261;
    for (let index = 0; index < str.length; index++) {
        hash ^= str.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};
