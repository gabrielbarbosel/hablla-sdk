/**
 * Hablla-format helpers. They respect Hablla's own data shapes (e.g. the custom
 * field key) but remain generic across every custom field — not tied to any one
 * field or feature.
 */

/** Keys shaped like `cf_<24-hex>` — a Hablla custom-field reference on a record. */
export const customFieldKeys = (record: Record<string, unknown>): string[] =>
    Object.keys(record).filter((key) => /^cf_[a-f0-9]{24}$/.test(key));
