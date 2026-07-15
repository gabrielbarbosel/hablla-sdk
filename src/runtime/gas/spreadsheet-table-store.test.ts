import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpreadsheetTableStore } from './spreadsheet-table-store';
import { HabllaStore, SECTORS_SCHEMA } from '../../sdk/store';

/**
 * Fake mínimo do SpreadsheetApp — modela o grid como uma matriz densa que cresce no setValues,
 * pra exercer a lógica REAL do backend (criação de aba, dimensionamento, padding, Date→ISO) sem
 * um GAS vivo. Só os métodos que o store usa.
 */
class FakeSheet {
    data: unknown[][] = [];
    maxRows = 1000;
    maxCols = 26;
    constructor(public name: string) {}
    getName() { return this.name; }
    getLastRow() { return this.data.length; }
    getLastColumn() { return this.data[0]?.length ?? 0; }
    getMaxRows() { return this.maxRows; }
    getMaxColumns() { return this.maxCols; }
    insertRowsAfter(_after: number, howMany: number) { this.maxRows += howMany; return this; }
    insertColumnsAfter(_after: number, howMany: number) { this.maxCols += howMany; return this; }
    clearContents() { this.data = []; return this; }
    getRange(row: number, col: number, numRows: number, numCols: number) {
        const sheet = this;
        return {
            getValues() {
                const out: unknown[][] = [];
                for (let r = 0; r < numRows; r++) {
                    const src = sheet.data[row - 1 + r] ?? [];
                    const line: unknown[] = [];
                    for (let c = 0; c < numCols; c++) line.push(src[col - 1 + c] ?? '');
                    out.push(line);
                }
                return out;
            },
            setValues(values: unknown[][]) {
                for (let r = 0; r < values.length; r++) {
                    sheet.data[row - 1 + r] = (sheet.data[row - 1 + r] ?? []).slice();
                    const line = values[r]!;
                    for (let c = 0; c < line.length; c++) sheet.data[row - 1 + r]![col - 1 + c] = line[c];
                }
                return this;
            },
        };
    }
}

class FakeSpreadsheet {
    sheets = new Map<string, FakeSheet>();
    getSheetByName(name: string) { return this.sheets.get(name) ?? null; }
    insertSheet(name: string) { const s = new FakeSheet(name); this.sheets.set(name, s); return s; }
    getSheets() { return [...this.sheets.values()]; }
}

let ss: FakeSpreadsheet;

beforeEach(() => {
    ss = new FakeSpreadsheet();
    (globalThis as unknown as { SpreadsheetApp: unknown }).SpreadsheetApp = {
        getActiveSpreadsheet: () => ss,
        openById: () => ss,
    };
});

afterEach(() => {
    delete (globalThis as unknown as { SpreadsheetApp?: unknown }).SpreadsheetApp;
});

describe('SpreadsheetTableStore', () => {
    it('returns [] for a table that does not exist yet', async () => {
        expect(await new SpreadsheetTableStore().read('missing')).toEqual([]);
    });

    it('creates a tab on write and round-trips the matrix', async () => {
        const store = new SpreadsheetTableStore();
        await store.write('sectors', [['id', 'name'], ['s1', 'A'], ['s2', 'B']]);
        expect(ss.getSheetByName('sectors')).not.toBeNull();
        expect(await store.read('sectors')).toEqual([['id', 'name'], ['s1', 'A'], ['s2', 'B']]);
    });

    it('grows the grid past its 1000-row default', async () => {
        const store = new SpreadsheetTableStore();
        const matrix = [['id']].concat(Array.from({ length: 1500 }, (_, i) => [`r${i}`]));
        await store.write('big', matrix);
        expect(ss.getSheetByName('big')!.getMaxRows()).toBeGreaterThanOrEqual(1501);
        expect(await store.read('big')).toHaveLength(1501);
    });

    it('normalizes Date cells to ISO and blanks to null on read', async () => {
        ss.insertSheet('t').data = [['id', 'when'], ['a', new Date('2026-07-15T12:00:00.000Z')], ['b', '']];
        const rows = await new SpreadsheetTableStore().read('t');
        expect(rows[1]).toEqual(['a', '2026-07-15T12:00:00.000Z']);
        expect(rows[2]).toEqual(['b', null]);
    });

    it('pads ragged rows so setValues stays rectangular', async () => {
        const store = new SpreadsheetTableStore();
        await store.write('t', [['a', 'b', 'c'], ['x']]); // second row shorter
        expect((await store.read('t'))[1]).toEqual(['x', null, null]);
    });

    it('drives a full HabllaStore cycle over the sheet backend', async () => {
        const store = new HabllaStore(new SpreadsheetTableStore({ spreadsheetId: 'sheet-1' }), [SECTORS_SCHEMA]);
        await store.migrate();
        await store.upsert('sectors', [{ id: 's1', name: 'Vendas', active: true, updatedAt: '2026-01-01' }], { now: 1000 });
        const all = await store.all('sectors');
        expect(all).toEqual([{ id: 's1', name: 'Vendas', active: true, updatedAt: '2026-01-01' }]);
        expect(await store.isFresh('sectors', 1000)).toBe(true);
        expect(ss.getSheetByName('_sync')).not.toBeNull();
    });
});
