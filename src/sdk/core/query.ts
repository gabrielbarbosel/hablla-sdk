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
