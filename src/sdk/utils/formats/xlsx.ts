/**
 * Pure OOXML / spreadsheetml `.xlsx` READER — the counterpart of the writer in
 * `domain/dispatch/xlsx.ts` ({@link buildXlsx}). It takes already-extracted XML
 * STRINGS (a worksheet part and, optionally, the shared-strings part) and returns
 * the value grid as `string[][]`.
 *
 * Unzipping the package and reading each part (`Utilities.unzip`, `getDataAsString`
 * in GAS; any zip reader elsewhere) is the CALLER's responsibility — this module
 * never performs I/O. It is a verbatim, TS-typed port of the proven regex parser,
 * with no external libraries and no `Buffer`/`TextEncoder`/env APIs, so it runs
 * unchanged in Node, GAS and the RPO isolate.
 */

/**
 * Decodes the XML entities produced inside spreadsheetml text nodes. `&amp;` is
 * decoded LAST, mirroring the original order, so sequences like `&amp;lt;` do not
 * get double-decoded into `<`.
 */
function xmlUnescape(value: string): string {
    if (value.indexOf('&') < 0) return value;

    return value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCharCode(Number(decimal)))
        .replace(/&amp;/g, '&');
}

/** Converts an "AB12" cell reference into a zero-based column index. */
function columnIndex(reference: string): number {
    const match = reference.match(/^([A-Z]+)/);
    if (!match) return 0;

    let index = 0;
    for (let i = 0; i < match[1]!.length; i++) index = index * 26 + (match[1]!.charCodeAt(i) - 64);

    return index - 1;
}

/** The two XML parts a reader needs: the worksheet, plus the optional shared strings. */
export interface XlsxParts {
    sheetXml: string;
    sharedStringsXml?: string;
}

/**
 * Parses the shared-strings part (`xl/sharedStrings.xml`) into a flat table. A
 * plain `<si>` yields its single `<t>`; a rich `<si>` (with `<r>` runs) yields the
 * concatenation of every `<t>` run. Each entry is XML-unescaped.
 */
export function parseSharedStrings(xml: string): string[] {
    const strings: string[] = [];
    const siRegex = /<si>([\s\S]*?)<\/si>/g;
    const tRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;

    let siMatch: RegExpExecArray | null;
    while ((siMatch = siRegex.exec(xml))) {
        const inner = siMatch[1]!;

        if (inner.indexOf('<r>') < 0) {
            const tMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
            strings.push(tMatch ? xmlUnescape(tMatch[1]!) : '');
            continue;
        }

        let text = '';
        let runMatch: RegExpExecArray | null;
        tRegex.lastIndex = 0;
        while ((runMatch = tRegex.exec(inner))) text += runMatch[1]!;

        strings.push(xmlUnescape(text));
    }

    return strings;
}

/**
 * Parses a worksheet part into a dense value grid. Cell type drives resolution:
 * `inlineStr` reads its `<t>`, `s` indexes into `shared`, anything else reads and
 * unescapes its `<v>`. Cells land at their `r="…"` column (falling back to
 * positional order), then every row is normalized to the widest column count with
 * gaps filled by `''`.
 */
export function parseWorksheet(xml: string, shared: readonly string[]): string[][] {
    const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
    const cellRegex = /<c\s+([^>\/]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    const grid: string[][] = [];
    let maxColumn = 0;

    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowRegex.exec(xml))) {
        const content = rowMatch[1]!;
        const row: string[] = [];

        if (content.indexOf('<c') >= 0) {
            let cellMatch: RegExpExecArray | null;
            cellRegex.lastIndex = 0;

            while ((cellMatch = cellRegex.exec(content))) {
                const attributes = cellMatch[1]!;
                const inner = cellMatch[2] || '';
                const referenceMatch = attributes.match(/r="([A-Z]+)/);
                const column = referenceMatch ? columnIndex(referenceMatch[1]!) : row.length;
                const typeMatch = attributes.match(/t="([^"]+)"/);
                const type = typeMatch ? typeMatch[1] : null;

                let value = '';
                if (type === 'inlineStr') {
                    const inlineMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
                    value = inlineMatch ? xmlUnescape(inlineMatch[1]!) : '';
                } else {
                    const valueMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
                    const raw = valueMatch ? valueMatch[1]! : '';
                    value = type === 's' ? (shared[Number(raw)] || '') : xmlUnescape(raw);
                }

                row[column] = value;
                if (column + 1 > maxColumn) maxColumn = column + 1;
            }
        }

        grid.push(row);
    }

    return grid.map((row) => {
        const normalized: string[] = [];
        for (let i = 0; i < maxColumn; i++) normalized.push(row[i] == null ? '' : row[i]!);
        return normalized;
    });
}

/**
 * Best-effort worksheet selection from a package's file names. Prefers
 * `xl/worksheets/sheet1.xml`, else the first name shaped `xl/worksheets/sheetN.xml`,
 * else `null`. Same heuristic as the original inline logic — it does not consult
 * `workbook.xml`/rels for the true sheet order.
 */
export function pickWorksheetName(names: readonly string[]): string | null {
    if (names.indexOf('xl/worksheets/sheet1.xml') >= 0) return 'xl/worksheets/sheet1.xml';
    for (const name of names) {
        if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) return name;
    }
    return null;
}

/**
 * Convenience combiner: resolves the shared strings (when present) and parses the
 * worksheet into the value grid.
 */
export function xlsxToRows(parts: XlsxParts): string[][] {
    const shared = parts.sharedStringsXml ? parseSharedStrings(parts.sharedStringsXml) : [];
    return parseWorksheet(parts.sheetXml, shared);
}
