import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CONTACTS_SHEET, CorruptedJobStoreError, EXCLUSIVE_ACCESS_WAIT_MS, IncompatibleJobStoreError, JOBS_SHEET, SheetDispatchJobStore } from './sheet-dispatch-job-store';
import { ArchivedJobError, JobNotFoundError, StaleJobError } from '../../sdk/domain/dispatch/workspace';
import { createJob } from '../../sdk/domain/dispatch/workspace/job-machine';
import { prepareAudience } from '../../sdk/domain/dispatch/workspace/audience';
import { NO_CALLS_SPENT, ROSTER, aRequest, aRow } from '../../sdk/domain/dispatch/workspace/__fixtures__/builders';
import type { DispatchContact, DispatchJob } from '../../sdk/domain/dispatch/workspace';

/** Dense in-memory sheet with the calls the store uses, including row deletion. */
class FakeSheet {
    data: unknown[][] = [];
    maxRows = 1000;
    hidden = false;
    readonly writes: Array<{ row: number; rows: number }> = [];

    getLastRow() {
        return this.data.length;
    }

    getMaxRows() {
        return this.maxRows;
    }

    insertRowsAfter(_after: number, howMany: number) {
        this.maxRows += howMany;
        return this;
    }

    deleteRows(rowPosition: number, howMany: number) {
        this.data.splice(rowPosition - 1, howMany);
    }

    hideSheet() {
        this.hidden = true;
        return this;
    }

    getRange(row: number, column: number, numRows: number, numColumns: number) {
        const sheet = this;
        return {
            getValues() {
                return Array.from({ length: numRows }, (_unused, offset) => {
                    const source = sheet.data[row - 1 + offset] ?? [];
                    return Array.from({ length: numColumns }, (_column, index) => source[column - 1 + index] ?? '');
                });
            },
            setValues(values: unknown[][]) {
                sheet.writes.push({ row, rows: values.length });
                values.forEach((line, offset) => {
                    sheet.data[row - 1 + offset] = [...line];
                });
                return this;
            },
        };
    }
}

let sheets: Map<string, FakeSheet>;
let lockEvents: string[];

beforeEach(() => {
    sheets = new Map();
    lockEvents = [];
    (globalThis as any).SpreadsheetApp = {
        openById: (id: string) => {
            expect(id).toBe('sheet-1');
            return {
                getSheetByName: (name: string) => sheets.get(name) ?? null,
                insertSheet: (name: string) => {
                    const sheet = new FakeSheet();
                    sheets.set(name, sheet);
                    return sheet;
                },
            };
        },
    };
    (globalThis as any).LockService = {
        getScriptLock: () => ({
            waitLock: (ms: number) => lockEvents.push(`wait:${ms}`),
            releaseLock: () => lockEvents.push('release'),
        }),
    };
});

afterEach(() => {
    delete (globalThis as any).SpreadsheetApp;
    delete (globalThis as any).LockService;
});

const NOW = 1_800_000_000_000;

/** A job with `count` contacts, labeled to vary the fingerprint. */
function aJobWith(count: number, suffix = '0'): { job: DispatchJob; contacts: DispatchContact[] } {
    const request = aRequest({ label: `job ${suffix}`, rows: Array.from({ length: count }, (_unused, index) => aRow(`${suffix}${index + 1}`)) });
    const prepared = prepareAudience(request, ROSTER);
    return { job: createJob(prepared, request, NOW + Number(suffix), NO_CALLS_SPENT), contacts: prepared.contacts };
}

describe('SheetDispatchJobStore', () => {
    it('requires a spreadsheet id', () => {
        expect(() => new SheetDispatchJobStore({ spreadsheetId: '' })).toThrow();
    });

    it('creates hidden tabs and reserves contiguous contact blocks per job', async () => {
        const store = new SheetDispatchJobStore({ spreadsheetId: 'sheet-1' });
        const first = aJobWith(3, '1');
        const second = aJobWith(2, '2');

        await store.insert(first.job, first.contacts);
        await store.insert(second.job, second.contacts);

        expect(sheets.get(JOBS_SHEET)!.hidden).toBe(true);
        expect(sheets.get(CONTACTS_SHEET)!.hidden).toBe(true);
        expect(sheets.get(CONTACTS_SHEET)!.data.map((row) => `${row[0] === first.job.id ? 'first' : 'second'}#${row[1]}`).slice(1)).toEqual(['first#0', 'first#1', 'first#2', 'second#0', 'second#1']);
    });

    it('round-trips jobs and contacts', async () => {
        const store = new SheetDispatchJobStore({ spreadsheetId: 'sheet-1' });
        const { job, contacts } = aJobWith(3, '1');

        await store.insert(job, contacts);

        expect(await store.load(job.id)).toEqual(job);
        expect(await store.loadContacts(job.id, { offset: 1, limit: 5 })).toEqual(contacts.slice(1));
        expect(await store.findByFingerprint(job.fingerprint)).toEqual([job]);
        expect(await store.findByPhases(['resolving'])).toEqual([job]);
        expect(await store.findByPhases(['completed'])).toEqual([]);
        await expect(store.load('missing')).rejects.toBeInstanceOf(JobNotFoundError);
    });

    it('updates the header and only the changed contact rows under compare-and-set', async () => {
        const store = new SheetDispatchJobStore({ spreadsheetId: 'sheet-1' });
        const { job, contacts } = aJobWith(4, '1');
        await store.insert(job, contacts);
        const contactsSheet = sheets.get(CONTACTS_SHEET)!;
        contactsSheet.writes.length = 0;

        const changed = [
            { ...contacts[1]!, outcome: 'ready' as const, person: { id: 'p1', existed: true } },
            { ...contacts[2]!, outcome: 'ready' as const },
        ];
        const updated = await store.update({ ...job, phase: 'awaitingConfirmation' }, changed);

        expect(updated.revision).toBe(1);
        expect(contactsSheet.writes).toEqual([{ row: 3, rows: 2 }]);
        expect(await store.loadContacts(job.id, { offset: 0, limit: 4 })).toEqual([contacts[0], changed[0], changed[1], contacts[3]]);
        expect(await store.loadPersonClaims(job.id)).toEqual(new Map([['p1', 1]]));
        expect((await store.load(job.id)).phase).toBe('awaitingConfirmation');
    });

    it('refuses an update at a stale revision without writing anything', async () => {
        const store = new SheetDispatchJobStore({ spreadsheetId: 'sheet-1' });
        const { job, contacts } = aJobWith(2, '1');
        await store.insert(job, contacts);
        await store.update(job, []);
        const before = JSON.stringify([...sheets.values()].map((sheet) => sheet.data));

        await expect(store.update({ ...job, phase: 'superseded' }, [{ ...contacts[0]!, outcome: 'excluded' }])).rejects.toBeInstanceOf(StaleJobError);
        expect(JSON.stringify([...sheets.values()].map((sheet) => sheet.data))).toBe(before);
    });

    it('detects rows that no longer hold the addressed contact', async () => {
        const store = new SheetDispatchJobStore({ spreadsheetId: 'sheet-1' });
        const { job, contacts } = aJobWith(3, '1');
        await store.insert(job, contacts);
        const data = sheets.get(CONTACTS_SHEET)!.data;
        [data[1], data[2]] = [data[2]!, data[1]!];

        await expect(store.loadContacts(job.id, { offset: 0, limit: 3 })).rejects.toBeInstanceOf(CorruptedJobStoreError);
        await expect(store.update(job, [contacts[0]!])).rejects.toBeInstanceOf(CorruptedJobStoreError);
    });

    it('holds the script lock around exclusive access, reentrantly for updates inside it', async () => {
        const store = new SheetDispatchJobStore({ spreadsheetId: 'sheet-1' });
        const { job, contacts } = aJobWith(1, '1');
        await store.insert(job, contacts);
        lockEvents.length = 0;

        await store.withExclusiveAccess(async () => {
            await store.update(job, []);
        });

        expect(lockEvents).toEqual([`wait:${EXCLUSIVE_ACCESS_WAIT_MS}`, 'release']);
    });

    it('archives a finished job, shifting the blocks stored after it', async () => {
        const store = new SheetDispatchJobStore({ spreadsheetId: 'sheet-1' });
        const first = aJobWith(2, '1');
        const second = aJobWith(3, '2');
        await store.insert(first.job, first.contacts);
        await store.insert(second.job, second.contacts);

        await expect(store.archive(first.job.id, NOW)).rejects.toThrow(/cannot be archived/);

        await store.update({ ...first.job, phase: 'completed' }, []);
        await store.archive(first.job.id, NOW);

        expect(await store.loadContacts(second.job.id, { offset: 0, limit: 3 })).toEqual(second.contacts);
        await expect(store.loadContacts(first.job.id, { offset: 0, limit: 2 })).rejects.toBeInstanceOf(ArchivedJobError);
        expect((await store.load(first.job.id)).phase).toBe('completed');
    });

    it('leaves an archived job out of the listing by phase, so nobody opens what has no contacts', async () => {
        const store = new SheetDispatchJobStore({ spreadsheetId: 'sheet-1' });
        const { job, contacts } = aJobWith(2, '1');
        await store.insert(job, contacts);
        await store.update({ ...job, phase: 'completed' }, []);

        expect((await store.findByPhases(['completed'])).map((found) => found.id)).toEqual([job.id]);

        await store.archive(job.id, NOW);

        expect(await store.findByPhases(['completed'])).toEqual([]);
    });

    it('refuses a job header stored before the call ledger existed, naming it', async () => {
        const store = new SheetDispatchJobStore({ spreadsheetId: 'sheet-1' });
        const { job, contacts } = aJobWith(1, '1');
        await store.insert(job, contacts);

        const { callEstimate: _estimate, callsSpent: _spent, ...legacy } = job;
        const row = sheets.get(JOBS_SHEET)!.data[1]!;
        row[row.length - 1] = JSON.stringify(legacy);

        await expect(store.load(job.id)).rejects.toBeInstanceOf(IncompatibleJobStoreError);
        await expect(store.findByPhases(['resolving'])).rejects.toThrow(job.id);
    });
});
