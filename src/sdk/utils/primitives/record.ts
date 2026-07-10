/**
 * Global primitives over a flat record/object. Domain-agnostic — they know
 * nothing about Hablla or dispatch, only about generic key shapes.
 */

/**
 * Values of indexed keys sharing a prefix (`<prefix>1`, `<prefix>2`…) ordered by
 * their numeric suffix. Generic: the caller chooses the prefix.
 */
export const collectIndexed = (record: Record<string, unknown>, prefix: string): unknown[] => {
    const pattern = new RegExp('^' + prefix + '\\d+$');
    return Object.keys(record)
        .filter((key) => pattern.test(key))
        .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)))
        .map((key) => record[key]);
};
