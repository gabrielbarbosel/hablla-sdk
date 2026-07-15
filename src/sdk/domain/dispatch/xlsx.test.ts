import { describe, it, expect } from 'vitest';
import { buildXlsx } from './xlsx';

describe('buildXlsx', () => {
    it('produces a ZIP (PK\\x03\\x04 local-file signature)', () => {
        const bytes = buildXlsx(['Name', 'Phone'], [['Alice', '5551999']]);
        expect(bytes[0]).toBe(0x50);
        expect(bytes[1]).toBe(0x4b);
        expect(bytes[2]).toBe(0x03);
        expect(bytes[3]).toBe(0x04);
    });

    it('ends with the End Of Central Directory signature (PK\\x05\\x06)', () => {
        const bytes = buildXlsx(['A'], [['x']]);
        const tail = bytes.slice(bytes.length - 22, bytes.length - 18);
        expect([...tail]).toEqual([0x50, 0x4b, 0x05, 0x06]);
    });

    it('packs exactly the five OOXML parts', () => {
        const bytes = buildXlsx(['A'], [['x']]);
        const text = String.fromCharCode(...bytes);
        for (const part of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml']) {
            expect(text.includes(part)).toBe(true);
        }
    });

    it('escapes XML metacharacters', () => {
        const bytes = buildXlsx(['Name'], [['A & <B>']]);
        const text = String.fromCharCode(...bytes);
        expect(text.includes('A &amp; &lt;B&gt;')).toBe(true);
    });

    it('emits multibyte UTF-8 for accented characters (é = 0xC3 0xA9)', () => {
        const bytes = buildXlsx(['Name'], [['é']]);
        let found = false;
        for (let i = 0; i < bytes.length - 1; i++) {
            if (bytes[i] === 0xc3 && bytes[i + 1] === 0xa9) found = true;
        }
        expect(found).toBe(true);
    });

    it('renders every cell as an inline string with a valid cell reference', () => {
        const bytes = buildXlsx(['A', 'B'], [['1', '2']]);
        const text = String.fromCharCode(...bytes);
        expect(text.includes('<c r="A1" t="inlineStr">')).toBe(true);
        expect(text.includes('<c r="B2" t="inlineStr">')).toBe(true);
    });

    it('coerces numbers and blanks to text', () => {
        const bytes = buildXlsx(['N'], [[42], ['']]);
        const text = String.fromCharCode(...bytes);
        expect(text.includes('<t xml:space="preserve">42</t>')).toBe(true);
    });
});
