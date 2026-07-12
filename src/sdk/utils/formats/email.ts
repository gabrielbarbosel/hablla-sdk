/**
 * Email-format helpers. They respect the email format but stay generic: the
 * synthesis rule (separator, domain) is a parameter, not a hardcoded destination.
 */

/** Loose check that a value looks like an email address. */
export const isEmail = (value: unknown): boolean => /@/.test(String(value ?? ''));

/** Parameters that synthesize an email from a field's accounts. */
export interface DeriveEmailRule {
    separator: string;
    domain: string;
}

/**
 * Synthesizes an email from a field holding one or more accounts. Splits on any
 * run of non-alphanumeric characters, joins the accounts with the separator and
 * appends the domain — e.g. `"123, 456"` with `{ separator: '+', domain: 'contas.xp' }`
 * becomes `"123+456@contas.xp"`. Returns `null` when no account is present.
 */
export const deriveEmail = (rawValue: unknown, rule: DeriveEmailRule): string | null => {
    const accounts = String(rawValue ?? '').split(/[^\dA-Za-z]+/).filter(Boolean);
    if (!accounts.length) return null;
    return accounts.join(rule.separator) + '@' + rule.domain;
};
