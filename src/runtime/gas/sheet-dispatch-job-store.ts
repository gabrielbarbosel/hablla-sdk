import type { ContactOutcome, ContactPage, DispatchContact, DispatchJob, DispatchJobPhase, DispatchJobStore } from '../../sdk/domain/dispatch/workspace';
import { holdsPersonClaim, JobNotFoundError, StaleJobError } from '../../sdk/domain/dispatch/workspace';

/** Apps Script bindings the store uses. */
declare const SpreadsheetApp: {
    openById(id: string): StoreSpreadsheet;
};

/** The script-wide lock that makes `withExclusiveAccess` mutually exclusive across executions. */
declare const LockService: {
    getScriptLock(): { waitLock(timeoutMs: number): void; releaseLock(): void };
};

/** The part of a spreadsheet the store uses. */
interface StoreSpreadsheet {
    getSheetByName(name: string): StoreSheet | null;
    insertSheet(name: string): StoreSheet;
}

/** The part of a sheet the store uses. */
interface StoreSheet {
    getLastRow(): number;
    getMaxRows(): number;
    insertRowsAfter(afterPosition: number, howMany: number): StoreSheet;
    deleteRows(rowPosition: number, howMany: number): void;
    getRange(row: number, column: number, numRows: number, numColumns: number): { getValues(): unknown[][]; setValues(values: unknown[][]): unknown };
    hideSheet(): StoreSheet;
}

/** Tab holding one row per job. */
export const JOBS_SHEET = 'dispatch_jobs';

/** Tab holding one contiguous block of rows per job. */
export const CONTACTS_SHEET = 'dispatch_job_contacts';

/** Columns of the jobs tab; `_raw` is the job header as JSON. */
export const JOB_COLUMNS = ['id', 'revision', 'fingerprint', 'phase', 'createdAt', 'updatedAt', 'contactsFirstRow', 'contactCount', 'leaseUntil', 'archivedAt', '_raw'] as const;

/** Columns of the contacts tab; `_raw` is the contact as JSON. */
export const CONTACT_COLUMNS = ['jobId', 'index', 'phone', 'name', 'outcome', 'personId', 'ownerChange', 'ownerSource', '_raw'] as const;

/** How long a caller waits for the script lock. */
export const EXCLUSIVE_ACCESS_WAIT_MS = 10_000;

/** First data row, below the header. */
const FIRST_DATA_ROW = 2;

/** Phases a job may be archived in. */
const ARCHIVABLE_PHASES: readonly DispatchJobPhase[] = ['completed', 'superseded', 'abandoned'];

/** Options of the store; the spreadsheet id comes from the app's typed config. */
export interface SheetDispatchJobStoreOptions {
    spreadsheetId: string;
}

/** A contact row does not hold the contact its address says: someone sorted or deleted rows of the hidden tab. */
export class CorruptedJobStoreError extends Error {
    constructor(readonly jobId: string, readonly row: number, readonly detail: string) {
        super(`Dispatch job store is corrupted at ${CONTACTS_SHEET} row ${row} of job ${jobId}: ${detail}`);
        this.name = 'CorruptedJobStoreError';
    }
}

/** A job row located in the jobs tab. */
interface LocatedJob {
    row: number;
    values: unknown[];
    job: DispatchJob;
}

/**
 * {@link DispatchJobStore} over a Google Sheet. Jobs live one per row; the contacts of a
 * job live in one contiguous block reserved at insert, addressed as
 * `contactsFirstRow + index`, and every read or write of a contact checks that the row
 * still holds that job and index. `update` is a compare-and-set on the revision column
 * under the script lock, which `withExclusiveAccess` also holds (reentrantly). Tabs are
 * created hidden.
 */
export class SheetDispatchJobStore implements DispatchJobStore {
    private holdsLock = false;

    constructor(private readonly options: SheetDispatchJobStoreOptions) {
        if (typeof options.spreadsheetId !== 'string' || options.spreadsheetId === '') {
            throw new Error('SheetDispatchJobStore: spreadsheetId is required');
        }
    }

    async withExclusiveAccess<T>(action: () => Promise<T>): Promise<T> {
        if (this.holdsLock) {
            return action();
        }

        const lock = LockService.getScriptLock();
        lock.waitLock(EXCLUSIVE_ACCESS_WAIT_MS);
        this.holdsLock = true;

        try {
            return await action();
        } finally {
            this.holdsLock = false;
            lock.releaseLock();
        }
    }

    async insert(job: DispatchJob, contacts: readonly DispatchContact[]): Promise<DispatchJob> {
        return this.withExclusiveAccess(async () => {
            const contactsSheet = this.sheet(CONTACTS_SHEET, CONTACT_COLUMNS);
            const jobsSheet = this.sheet(JOBS_SHEET, JOB_COLUMNS);
            const contactsFirstRow = contactsSheet.getLastRow() + 1;
            const stored: DispatchJob = { ...job, revision: 0 };

            if (contacts.length > 0) {
                writeRows(contactsSheet, contactsFirstRow, contacts.map((contact) => contactRow(job.id, contact)));
            }

            writeRows(jobsSheet, jobsSheet.getLastRow() + 1, [jobRow(stored, contactsFirstRow, contacts.length, '')]);

            return stored;
        });
    }

    async load(jobId: string): Promise<DispatchJob> {
        return this.locate(jobId).job;
    }

    async findByFingerprint(fingerprint: string): Promise<DispatchJob[]> {
        return this.jobRows().filter((values) => String(values[jobColumn('fingerprint')]) === fingerprint).map(jobOfRow);
    }

    async findByPhases(phases: readonly DispatchJobPhase[]): Promise<DispatchJob[]> {
        return this.jobRows().filter((values) => phases.includes(String(values[jobColumn('phase')]) as DispatchJobPhase)).map(jobOfRow);
    }

    async loadContacts(jobId: string, page: ContactPage): Promise<DispatchContact[]> {
        const block = this.contactBlock(this.locate(jobId));
        const offset = Math.max(0, page.offset);
        const count = Math.min(page.limit, block.contactCount - offset);

        if (count <= 0) {
            return [];
        }

        return this.readContactRows(jobId, block.firstRow, offset, count).map((values) => JSON.parse(String(values[contactColumn('_raw')])) as DispatchContact);
    }

    async loadPersonClaims(jobId: string): Promise<ReadonlyMap<string, number>> {
        const block = this.contactBlock(this.locate(jobId));
        const claims = new Map<string, number>();

        if (block.contactCount === 0) {
            return claims;
        }

        for (const values of this.readContactRows(jobId, block.firstRow, 0, block.contactCount)) {
            const personId = String(values[contactColumn('personId')]);
            const outcome = String(values[contactColumn('outcome')]) as ContactOutcome;
            const index = Number(values[contactColumn('index')]);

            if (personId !== '' && holdsPersonClaim(outcome) && !claims.has(personId)) {
                claims.set(personId, index);
            }
        }

        return claims;
    }

    async update(job: DispatchJob, changedContacts: readonly DispatchContact[]): Promise<DispatchJob> {
        return this.withExclusiveAccess(async () => {
            const located = this.locate(job.id);
            const storedRevision = Number(located.values[jobColumn('revision')]);

            if (storedRevision !== job.revision) {
                throw new StaleJobError(job.id, job.revision);
            }

            const block = this.contactBlock(located);
            const contactsSheet = this.sheet(CONTACTS_SHEET, CONTACT_COLUMNS);

            for (const run of consecutiveRuns(changedContacts)) {
                this.readContactRows(job.id, block.firstRow, run[0]!.index, run.length);
                writeRows(contactsSheet, block.firstRow + run[0]!.index, run.map((contact) => contactRow(job.id, contact)));
            }

            const updated: DispatchJob = { ...job, revision: storedRevision + 1 };
            writeRows(this.sheet(JOBS_SHEET, JOB_COLUMNS), located.row, [jobRow(updated, block.firstRow, block.contactCount, '')]);

            return updated;
        });
    }

    /**
     * Frees the contact block of a finished job that no execution holds, shifting the
     * blocks stored after it, and keeps the header marked as archived.
     *
     * @throws Error when the job is not in a finished phase or is leased.
     */
    async archive(jobId: string, now: number): Promise<void> {
        await this.withExclusiveAccess(async () => {
            const located = this.locate(jobId);
            const block = this.contactBlock(located);

            if (!ARCHIVABLE_PHASES.includes(located.job.phase) || (located.job.leaseUntil !== undefined && located.job.leaseUntil > now)) {
                throw new Error(`Dispatch job ${jobId} cannot be archived in phase ${located.job.phase} or while leased`);
            }

            if (block.contactCount > 0) {
                this.sheet(CONTACTS_SHEET, CONTACT_COLUMNS).deleteRows(block.firstRow, block.contactCount);
            }

            const jobsSheet = this.sheet(JOBS_SHEET, JOB_COLUMNS);

            this.jobRows().forEach((values, position) => {
                const firstRow = Number(values[jobColumn('contactsFirstRow')]);

                if (firstRow > block.firstRow) {
                    const shifted = [...values];
                    shifted[jobColumn('contactsFirstRow')] = firstRow - block.contactCount;
                    writeRows(jobsSheet, FIRST_DATA_ROW + position, [shifted]);
                }
            });

            writeRows(jobsSheet, located.row, [jobRow(located.job, 0, block.contactCount, now)]);
        });
    }

    /** The job row of an id. */
    private locate(jobId: string): LocatedJob {
        const rows = this.jobRows();
        const position = rows.findIndex((values) => String(values[jobColumn('id')]) === jobId);

        if (position < 0) {
            throw new JobNotFoundError(jobId);
        }

        return { row: FIRST_DATA_ROW + position, values: rows[position]!, job: jobOfRow(rows[position]!) };
    }

    /** Where a job's contacts live; archived jobs have none left. */
    private contactBlock(located: LocatedJob): { firstRow: number; contactCount: number } {
        if (String(located.values[jobColumn('archivedAt')]) !== '') {
            throw new Error(`Dispatch job ${located.job.id} is archived; its contacts were removed`);
        }

        return { firstRow: Number(located.values[jobColumn('contactsFirstRow')]), contactCount: Number(located.values[jobColumn('contactCount')]) };
    }

    /** Every job row. */
    private jobRows(): unknown[][] {
        const sheet = this.sheet(JOBS_SHEET, JOB_COLUMNS);
        const rows = sheet.getLastRow() - 1;

        return rows > 0 ? sheet.getRange(FIRST_DATA_ROW, 1, rows, JOB_COLUMNS.length).getValues() : [];
    }

    /**
     * Reads contact rows of a job and checks each row holds that job and index.
     *
     * @throws CorruptedJobStoreError on the first row that does not.
     */
    private readContactRows(jobId: string, firstRow: number, fromIndex: number, count: number): unknown[][] {
        const rows = this.sheet(CONTACTS_SHEET, CONTACT_COLUMNS).getRange(firstRow + fromIndex, 1, count, CONTACT_COLUMNS.length).getValues();

        rows.forEach((values, offset) => {
            const expectedIndex = fromIndex + offset;

            if (String(values[contactColumn('jobId')]) !== jobId || Number(values[contactColumn('index')]) !== expectedIndex) {
                throw new CorruptedJobStoreError(jobId, firstRow + expectedIndex, `expected index ${expectedIndex}, found ${String(values[contactColumn('jobId')])}#${String(values[contactColumn('index')])}`);
            }
        });

        return rows;
    }

    /** A tab, created hidden with its header when missing. */
    private sheet(name: string, columns: readonly string[]): StoreSheet {
        const spreadsheet = SpreadsheetApp.openById(this.options.spreadsheetId);
        const existing = spreadsheet.getSheetByName(name);

        if (existing) {
            return existing;
        }

        const created = spreadsheet.insertSheet(name);
        created.hideSheet();
        writeRows(created, 1, [[...columns]]);

        return created;
    }
}

/** Column position of a job field. */
function jobColumn(column: (typeof JOB_COLUMNS)[number]): number {
    return JOB_COLUMNS.indexOf(column);
}

/** Column position of a contact field. */
function contactColumn(column: (typeof CONTACT_COLUMNS)[number]): number {
    return CONTACT_COLUMNS.indexOf(column);
}

/** The row of a job header. */
function jobRow(job: DispatchJob, contactsFirstRow: number, contactCount: number, archivedAt: number | ''): unknown[] {
    return [job.id, job.revision, job.fingerprint, job.phase, job.createdAt, job.updatedAt, contactsFirstRow, contactCount, job.leaseUntil ?? '', archivedAt, JSON.stringify(job)];
}

/** The job header of a row. */
function jobOfRow(values: readonly unknown[]): DispatchJob {
    return JSON.parse(String(values[jobColumn('_raw')])) as DispatchJob;
}

/** The row of a contact. */
function contactRow(jobId: string, contact: DispatchContact): unknown[] {
    return [
        jobId,
        contact.index,
        contact.phone?.digits ?? '',
        contact.name,
        contact.outcome,
        contact.person?.id ?? '',
        contact.ownerChange?.kind ?? '',
        contact.target?.source ?? '',
        JSON.stringify(contact),
    ];
}

/** Writes rows from `firstRow`, growing the grid when needed. */
function writeRows(sheet: StoreSheet, firstRow: number, rows: readonly unknown[][]): void {
    const lastRow = firstRow + rows.length - 1;
    const maxRows = sheet.getMaxRows();

    if (lastRow > maxRows) {
        sheet.insertRowsAfter(maxRows, lastRow - maxRows);
    }

    sheet.getRange(firstRow, 1, rows.length, rows[0]!.length).setValues(rows.map((row) => [...row]));
}

/** Contacts grouped into runs of consecutive indexes, so each run is one range write. */
function consecutiveRuns(contacts: readonly DispatchContact[]): DispatchContact[][] {
    const sorted = [...contacts].sort((first, second) => first.index - second.index);
    const runs: DispatchContact[][] = [];

    for (const contact of sorted) {
        const run = runs[runs.length - 1];

        if (run && run[run.length - 1]!.index + 1 === contact.index) {
            run.push(contact);
        } else {
            runs.push([contact]);
        }
    }

    return runs;
}
