import { describe, it, expect } from 'vitest';
import { parseSharedStrings, parseWorksheet, pickWorksheetName, xlsxToRows } from './xlsx';

describe('parseSharedStrings', () => {
    it('reads plain and rich (run) shared strings', () => {
        const xml = '<sst><si><t>Ana</t></si><si><r><t>Jo</t></r><r><t>ao</t></r></si></sst>';
        expect(parseSharedStrings(xml)).toEqual(['Ana', 'Joao']);
    });
});

describe('parseWorksheet', () => {
    it('resolves shared, inlineStr and numeric cells and normalizes gaps', () => {
        const shared = ['Ana'];
        const xml =
            '<worksheet><sheetData>' +
            '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Sao</t></is></c><c r="C1"><v>42</v></c></row>' +
            '<row r="2"><c r="A2" t="inlineStr"><is><t>x</t></is></c><c r="C2"><v>9</v></c></row>' +
            '</sheetData></worksheet>';

        const grid = parseWorksheet(xml, shared);
        expect(grid).toEqual([
            ['Ana', 'Sao', '42'],
            ['x', '', '9'],
        ]);
        expect(grid.every((row) => row.length === 3)).toBe(true);
    });

    it('decodes entities without double-decoding &amp;lt;', () => {
        const xml =
            '<worksheet><sheetData><row r="1">' +
            '<c r="A1" t="inlineStr"><is><t>a &amp; b</t></is></c>' +
            '<c r="B1" t="inlineStr"><is><t>1 &lt; 2 &gt; 0</t></is></c>' +
            '<c r="C1" t="inlineStr"><is><t>caf&#233;</t></is></c>' +
            '<c r="D1" t="inlineStr"><is><t>&amp;lt;</t></is></c>' +
            '</row></sheetData></worksheet>';

        expect(parseWorksheet(xml, [])).toEqual([['a & b', '1 < 2 > 0', 'café', '&lt;']]);
    });
});

describe('xlsxToRows', () => {
    it('combines a sharedStrings part with a worksheet part', () => {
        const sharedStringsXml = '<sst><si><t>Ana</t></si><si><t>Beto</t></si></sst>';
        const sheetXml =
            '<worksheet><sheetData>' +
            '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
            '</sheetData></worksheet>';

        expect(xlsxToRows({ sheetXml, sharedStringsXml })).toEqual([['Ana', 'Beto']]);
    });

    it('works without a sharedStrings part', () => {
        const sheetXml =
            '<worksheet><sheetData><row r="1"><c r="A1"><v>7</v></c></row></sheetData></worksheet>';
        expect(xlsxToRows({ sheetXml })).toEqual([['7']]);
    });
});

describe('pickWorksheetName', () => {
    it('prefers sheet1.xml', () => {
        expect(pickWorksheetName(['xl/worksheets/sheet3.xml', 'xl/worksheets/sheet1.xml'])).toBe(
            'xl/worksheets/sheet1.xml',
        );
    });

    it('falls back to the first sheetN.xml', () => {
        expect(pickWorksheetName(['xl/sharedStrings.xml', 'xl/worksheets/sheet2.xml'])).toBe(
            'xl/worksheets/sheet2.xml',
        );
    });

    it('returns null when no worksheet matches', () => {
        expect(pickWorksheetName(['xl/workbook.xml', '[Content_Types].xml'])).toBeNull();
    });
});
