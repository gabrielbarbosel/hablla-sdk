/**
 * Minimal, dependency-free `.xlsx` writer for the mass-import path. Produces a
 * single-sheet workbook with every cell as an inline string (`t="inlineStr"`),
 * packed into an uncompressed (STORED) ZIP with CRC-32. Runtime-agnostic: it
 * emits a {@link Uint8Array} and never touches `Buffer` or `TextEncoder`, so it
 * runs unchanged in Node, the browser and the RPO isolate.
 *
 * Hablla's `/import` accepts a spreadsheet; this turns a list of records into
 * that spreadsheet in memory, so a caller never has to author or ship a file.
 */

const COLUMN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Encodes a string as UTF-8 bytes without depending on `TextEncoder`. */
function utf8(text: string): number[] {
    const out: number[] = [];
    for (let i = 0; i < text.length; i++) {
        let code = text.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
            const next = text.charCodeAt(i + 1);
            if (next >= 0xdc00 && next <= 0xdfff) {
                code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
                i++;
            }
        }
        if (code < 0x80) {
            out.push(code);
        } else if (code < 0x800) {
            out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else if (code < 0x10000) {
            out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        } else {
            out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
    }
    return out;
}

function crc32(bytes: number[]): number {
    let crc = ~0;
    for (let i = 0; i < bytes.length; i++) {
        crc ^= bytes[i] ?? 0;
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (~crc) >>> 0;
}

function columnName(index: number): string {
    let name = '';
    let n = index;
    do {
        name = (COLUMN_LETTERS[n % 26] ?? 'A') + name;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return name;
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function sheetXml(rows: string[][]): string {
    const body = rows
        .map((cells, r) => {
            const inner = cells
                .map((value, c) => `<c r="${columnName(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`)
                .join('');
            return `<row r="${r + 1}">${inner}</row>`;
        })
        .join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

interface ZipEntry {
    name: string;
    bytes: number[];
}

function zipStored(entries: ZipEntry[]): Uint8Array {
    const locals: number[][] = [];
    const centrals: number[][] = [];
    let offset = 0;

    const u16 = (n: number) => [n & 0xff, (n >>> 8) & 0xff];
    const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

    for (const entry of entries) {
        const nameBytes = utf8(entry.name);
        const crc = crc32(entry.bytes);
        const size = entry.bytes.length;

        const local = [
            ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
            ...u32(crc), ...u32(size), ...u32(size), ...u16(nameBytes.length), ...u16(0),
            ...nameBytes, ...entry.bytes,
        ];
        locals.push(local);

        const central = [
            ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
            ...u32(crc), ...u32(size), ...u32(size), ...u16(nameBytes.length), ...u16(0), ...u16(0),
            ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...nameBytes,
        ];
        centrals.push(central);
        offset += local.length;
    }

    const localPart = locals.flat();
    const centralPart = centrals.flat();
    const eocd = [
        ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length),
        ...u32(centralPart.length), ...u32(localPart.length), ...u16(0),
    ];

    return Uint8Array.from([...localPart, ...centralPart, ...eocd]);
}

const CONTENT_TYPES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';

const ROOT_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';

const WORKBOOK =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>';

const WORKBOOK_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';

/**
 * Builds an `.xlsx` from a header row plus data rows (all rendered as text).
 * @returns the workbook bytes, ready to send as a `MultipartFile.data`.
 */
export function buildXlsx(header: string[], rows: Array<Array<string | number>>): Uint8Array {
    const asText = (value: string | number) => (value === null || value === undefined ? '' : String(value));
    const matrix = [header, ...rows.map((row) => row.map(asText))];
    return zipStored([
        { name: '[Content_Types].xml', bytes: utf8(CONTENT_TYPES) },
        { name: '_rels/.rels', bytes: utf8(ROOT_RELS) },
        { name: 'xl/workbook.xml', bytes: utf8(WORKBOOK) },
        { name: 'xl/_rels/workbook.xml.rels', bytes: utf8(WORKBOOK_RELS) },
        { name: 'xl/worksheets/sheet1.xml', bytes: utf8(sheetXml(matrix)) },
    ]);
}
