import type { ColumnValue, Matrix, TableStore } from '../../sdk/store';

/**
 * Bindings do Apps Script que o store usa (só o necessário). SpreadsheetApp é síncrono em
 * qualquer contexto server do GAS, então as operações retornam via `Promise.resolve` — o
 * docker (Promise síncrono) resolve inline sob `runSync`, igual ao {@link UrlFetchTransport}.
 */
declare const SpreadsheetApp: {
    getActiveSpreadsheet(): GasSpreadsheet | null;
    openById(id: string): GasSpreadsheet;
};

interface GasSpreadsheet {
    getSheetByName(name: string): GasSheet | null;
    insertSheet(name: string): GasSheet;
    getSheets(): GasSheet[];
}

interface GasSheet {
    getName(): string;
    getLastRow(): number;
    getLastColumn(): number;
    getMaxRows(): number;
    getMaxColumns(): number;
    insertRowsAfter(afterPosition: number, howMany: number): GasSheet;
    insertColumnsAfter(afterPosition: number, howMany: number): GasSheet;
    getRange(row: number, column: number, numRows: number, numColumns: number): GasRange;
    clearContents(): GasSheet;
}

interface GasRange {
    getValues(): unknown[][];
    setValues(values: unknown[][]): GasRange;
}

/** Opções do {@link SpreadsheetTableStore}. */
export interface SpreadsheetTableStoreOptions {
    /** Id da planilha; ausente ⇒ a planilha ativa (script container-bound). */
    spreadsheetId?: string;
}

/**
 * Backend hot do storage ({@link TableStore}) sobre uma Google Sheet via `SpreadsheetApp` —
 * a Fase 2 do design (`docs/storage`). Uma aba por tabela: `read` devolve a matriz
 * `[header, ...linhas]` da aba (vazio se ela não existe ainda), `write` a substitui inteira,
 * criando a aba e crescendo o grid conforme o necessário. Toda a lógica de schema/projeção/
 * merge/`_sync` vive acima, no {@link HabllaStore}; aqui só há I/O de célula.
 *
 * Datas: `getValues` devolve `Date` para células que a planilha interpretou como data; a
 * leitura normaliza `Date → ISO` para o que o `parseRow`/JSON enxerga ser estável (o registro
 * completo volta pelo `_raw` de qualquer forma).
 */
export class SpreadsheetTableStore implements TableStore {
    constructor(private readonly options: SpreadsheetTableStoreOptions = {}) {}

    private spreadsheet(): GasSpreadsheet {
        const { spreadsheetId } = this.options;
        if (spreadsheetId) return SpreadsheetApp.openById(spreadsheetId);
        const active = SpreadsheetApp.getActiveSpreadsheet();
        if (!active) throw new Error('SpreadsheetTableStore: sem spreadsheetId e sem planilha ativa.');
        return active;
    }

    async read(table: string): Promise<Matrix> {
        const sheet = this.spreadsheet().getSheetByName(table);
        if (!sheet) return [];
        const rows = sheet.getLastRow();
        const cols = sheet.getLastColumn();
        if (rows < 1 || cols < 1) return [];
        const values = sheet.getRange(1, 1, rows, cols).getValues();
        return values.map((row) => row.map(normalizeCell));
    }

    async write(table: string, matrix: Matrix): Promise<void> {
        const ss = this.spreadsheet();
        const sheet = ss.getSheetByName(table) ?? ss.insertSheet(table);
        sheet.clearContents();
        if (!matrix.length) return;
        const cols = matrix[0]?.length ?? 0;
        if (!cols) return;
        this.ensureGrid(sheet, matrix.length, cols);
        sheet.getRange(1, 1, matrix.length, cols).setValues(padMatrix(matrix, cols));
    }

    async tables(): Promise<string[]> {
        return this.spreadsheet().getSheets().map((s) => s.getName());
    }

    /** Cresce o grid da aba para caber `rows × cols` (o grid nasce 1000×26; tabelas grandes passam disso). */
    private ensureGrid(sheet: GasSheet, rows: number, cols: number): void {
        const maxRows = sheet.getMaxRows();
        if (rows > maxRows) sheet.insertRowsAfter(maxRows, rows - maxRows);
        const maxCols = sheet.getMaxColumns();
        if (cols > maxCols) sheet.insertColumnsAfter(maxCols, cols - maxCols);
    }
}

/** `Date → ISO`, e `''`/`undefined → null`; o resto passa como scalar (string/number/boolean). */
function normalizeCell(value: unknown): ColumnValue {
    if (value instanceof Date) return value.toISOString();
    if (value == null || value === '') return null;
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') return value as ColumnValue;
    return String(value);
}

/** Garante linhas retangulares (setValues exige) — completa cada linha até `cols` com `null`. */
function padMatrix(matrix: Matrix, cols: number): ColumnValue[][] {
    return matrix.map((row) => {
        if (row.length === cols) return row;
        const out = row.slice(0, cols);
        while (out.length < cols) out.push(null);
        return out;
    });
}
