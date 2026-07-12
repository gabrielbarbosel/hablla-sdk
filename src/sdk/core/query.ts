/**
 * Serializes a query object using the `qs` `arrayFormat:"indices"` convention, the
 * same as the web app (`users[0]=a&users[1]=b`, nested `a[b]=c`). Never applies
 * JSON.stringify to arrays or objects.
 */
export function serializeQuery(obj: Record<string, unknown> | null | undefined): string {
    if (!obj || typeof obj !== 'object') return '';
    const parts: string[] = [];
    const add = (key: string, val: unknown): void => {
        if (val == null) return;
        if (Array.isArray(val)) {
            val.forEach((v, i) => add(`${key}[${i}]`, v));
        } else if (typeof val === 'object') {
            for (const [k, v] of Object.entries(val as Record<string, unknown>)) add(`${key}[${k}]`, v);
        } else {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
        }
    };
    for (const [k, v] of Object.entries(obj)) add(k, v);
    return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Serializes a query the way the web app's `getWithConfig` helper does: every
 * first-level object or array value is `JSON.stringify`-ed into a single scalar
 * (`?filters={"stage":"x"}`), scalars are sent verbatim. These endpoints read the
 * JSON form and IGNORE the qs-indices form (`filters[stage]=x`), so nested
 * filters silently vanish under {@link serializeQuery}. Null/undefined are
 * skipped; both key and value are URL-encoded.
 */
export function serializeQueryJson(obj: Record<string, unknown> | null | undefined): string {
    if (!obj || typeof obj !== 'object') return '';
    const parts: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
        if (val == null) continue;
        const encoded = typeof val === 'object' ? JSON.stringify(val) : String(val);
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(encoded)}`);
    }
    return parts.length ? `?${parts.join('&')}` : '';
}
