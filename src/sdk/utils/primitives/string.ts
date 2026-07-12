/**
 * Global string primitives. Zero domain knowledge, zero I/O, zero state — the
 * bottom of the utils pyramid. Anything format- or domain-aware belongs in
 * `utils/formats`, not here.
 */

/** Keeps only the digits of a value. */
export const toDigits = (value: unknown): string => String(value ?? '').replace(/\D/g, '');
