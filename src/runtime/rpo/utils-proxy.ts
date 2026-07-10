import type { PhoneVariants, DeriveEmailRule } from '../../sdk/utils';

/**
 * RPO-only stand-in for the utils barrel. In the deployed client the utils live in
 * their own `W_Utils` class (as `globalThis.HABLLA_UTILS`), so the client stays
 * purist and does not inline them. The build redirects `sdk/utils` to this module
 * for the `W_HabllaClient` bundle only; local builds and tests use the real utils.
 *
 * Every lookup is **lazy** (resolved at call time, not at module load), so it does
 * not matter whether `W_Utils` executed before or after `W_HabllaClient` — by the
 * time a flow calls into the client, every class has run and the global is set.
 */
const bag = (): any => (globalThis as unknown as { HABLLA_UTILS: any }).HABLLA_UTILS;

export const toDigits = (value: unknown): string => bag().toDigits(value);
export const phoneVariants = (value: unknown): PhoneVariants => bag().phoneVariants(value);
export const matchesPhone = (candidate: unknown, variants: PhoneVariants): boolean => bag().matchesPhone(candidate, variants);
export const isEmail = (value: unknown): boolean => bag().isEmail(value);
export const deriveEmail = (rawValue: unknown, rule: DeriveEmailRule): string | null => bag().deriveEmail(rawValue, rule);
export const collectIndexed = (record: Record<string, unknown>, prefix: string): unknown[] => bag().collectIndexed(record, prefix);
export const customFieldKeys = (record: Record<string, unknown>): string[] => bag().customFieldKeys(record);

export type { PhoneVariants, DeriveEmailRule } from '../../sdk/utils';
