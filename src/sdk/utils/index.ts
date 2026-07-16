/**
 * Public surface of the utils layer. Everything here is pure (no I/O, no module
 * state) — safe inside a flow isolate and unit testable in plain Node. Two tiers:
 *
 * - `primitives/` — global, format-agnostic building blocks (strings, records…).
 * - `formats/`    — respect a known format (BR phone, email, Hablla shapes) but
 *                   stay generic within it; parameterized, never feature-specific.
 *
 * Domain modules import from here and never reach into a tier directly, so the
 * internal split can evolve without touching callers.
 */

/** primitives (global) */
export { toDigits, firstName, hashString } from './primitives/string';
export { collectIndexed } from './primitives/record';
export { distributeOwners } from './primitives/distribute';
export type { OwnerStrategy } from './primitives/distribute';

/** formats (specific to a format, still generic) */
export { phoneVariants, matchesPhone } from './formats/phone';
export type { PhoneVariants } from './formats/phone';
export { isEmail, deriveEmail } from './formats/email';
export type { DeriveEmailRule } from './formats/email';
export { customFieldKeys } from './formats/hablla';
export { xlsxToRows, parseSharedStrings, parseWorksheet, pickWorksheetName } from './formats/xlsx';
export type { XlsxParts } from './formats/xlsx';
