import type { HabllaClient } from '../../client';
import type {
    MassDispatchContact,
    MassDispatchSpec,
    MassDispatchResult,
    MassDispatchLedgerEntry,
    AttendanceGuard,
    AttendanceGuardReport,
    DispatchLedger,
} from './types';
import { buildXlsx } from './xlsx';
import { phoneVariants, toDigits } from '../../utils';
import type { ServiceStatusCode } from '../../resources/gen_enums';

const DEFAULT_COLUMNS = ['Name', 'DDI', 'Phone', 'Email', 'SSN'];
const DEFAULT_DDI = '55';
const DEFAULT_PACING = { batch_interval: 0.3, batch_size: 5 };
const DEFAULT_INDEX_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 2_500;
const GUARD_BUSY_STATUSES: ServiceStatusCode[] = ['in_attendance'];
const GUARD_PAGE_SIZE = 50;
const GUARD_MAX_PAGES = 200;

/**
 * Flow-less mass dispatch, composed from Hablla API primitives. The whole audience
 * is materialized with `import` (one call per owner group, O(1) in the number of
 * contacts) and sent with a single `type: whatsapp` campaign over a batch
 * segmentation — no per-contact flow execution, so no per-execution billing.
 *
 * Each primitive ({@link importContacts}, {@link waitForAudience}, {@link sendCampaign})
 * is public and standalone, so other contexts can reuse them without the full run.
 * Every dispatch is written to the injected {@link DispatchLedger} — the canonical
 * dispatch↔audience record that replaces the legacy phone+time-window reconstruction.
 */
export class MassDispatch {
    constructor(private readonly client: HabllaClient, private readonly ledger?: DispatchLedger) {}

    /**
     * Materializes the contacts, waits for them to index, fires one campaign, and
     * records the ledger entry.
     * @param sleep injectable delay (ms) — the RPO isolate has no timers, so a
     *   runtime passes its own; defaults to `setTimeout`.
     */
    async run(
        contacts: MassDispatchContact[],
        spec: MassDispatchSpec,
        sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    ): Promise<MassDispatchResult> {
        if (!contacts.length) throw new Error('MassDispatch.run: no contacts');
        if (!spec.connectionId) throw new Error('MassDispatch.run: connectionId is required');
        if (!spec.templateId) throw new Error('MassDispatch.run: templateId is required');

        const { audience, guard } = await this.applyAttendanceGuard(contacts, spec);
        if (!audience.length) {
            const empty: MassDispatchResult = { segmentationId: '', imported: 0, audienceCount: 0, ownerMap: {}, status: 'empty_audience', guard };
            await this.recordLedger(empty, spec);
            return empty;
        }

        const segmentationId = await this.createBatchSegmentation(spec);

        const groups = this.groupByOwner(audience, spec);
        const ownerMap: Record<string, number> = {};
        let imported = 0;
        for (const group of groups) {
            await this.importContacts(group.contacts, { owner: group.owner, segmentationId, spec });
            ownerMap[group.owner ?? 'unassigned'] = group.contacts.length;
            imported += group.contacts.length;
        }

        const audienceCount = await this.waitForAudience(segmentationId, imported, spec.indexTimeoutMs ?? DEFAULT_INDEX_TIMEOUT_MS, sleep);

        let campaignId: string | undefined;
        let status = 'sent';
        if (audienceCount > 0) {
            const campaign = await this.sendCampaign({ segmentationId, spec });
            campaignId = (campaign as { id?: string })?.id;
        } else {
            status = 'empty_audience';
        }

        const result: MassDispatchResult = { segmentationId, campaignId, imported, audienceCount, ownerMap, status, guard };
        await this.recordLedger(result, spec);
        return result;
    }

    /**
     * Runs the {@link AttendanceGuard} against the connection's open attendances and
     * returns the audience to actually dispatch to plus a report of what it did.
     * With no guard (or `mode: 'off'`) it is a no-op that returns the contacts as-is.
     */
    async applyAttendanceGuard(
        contacts: MassDispatchContact[],
        spec: MassDispatchSpec,
    ): Promise<{ audience: MassDispatchContact[]; guard?: AttendanceGuardReport }> {
        const config = spec.attendanceGuard;
        if (!config || config.mode === 'off') return { audience: contacts };

        const defaultDdi = spec.defaultDdi ?? DEFAULT_DDI;
        const statuses = config.statuses?.length ? config.statuses : GUARD_BUSY_STATUSES;
        const { byPhoneKey, scanned, truncated } = await this.collectOpenAttendances(spec.connectionId, statuses, config.sectors);

        const matchedServices = new Set<string>();
        const matchedContacts = new Set<MassDispatchContact>();
        for (const contact of contacts) {
            for (const key of this.phoneKeys(contact, defaultDdi)) {
                const services = byPhoneKey.get(key);
                if (services) {
                    matchedContacts.add(contact);
                    for (const id of services) matchedServices.add(id);
                    break;
                }
            }
        }

        const report: AttendanceGuardReport = { mode: config.mode, scannedOpen: scanned, matched: matchedContacts.size, skipped: 0, finished: 0, truncated };

        if (config.mode === 'skip') {
            report.skipped = matchedContacts.size;
            return { audience: contacts.filter((contact) => !matchedContacts.has(contact)), guard: report };
        }

        if (matchedServices.size) {
            await this.settleAttendances({ action: 'finished', target: { ids: [...matchedServices] }, sector: config.finishSector, reason: config.finishReason });
            report.finished = matchedServices.size;
        }
        return { audience: contacts, guard: report };
    }

    /**
     * Pages the open attendances on a connection into a phone-keyed index of the
     * service ids holding them. Scoped to the connection (and optional sectors) so it
     * is bounded by the open-attendance count, not the contact count. Both 9th-digit
     * shapes of every phone are indexed, so a single lookup catches the variance.
     */
    async collectOpenAttendances(
        connectionId: string,
        statuses: string[],
        sectors?: string[],
    ): Promise<{ byPhoneKey: Map<string, string[]>; scanned: number; truncated: boolean }> {
        const byPhoneKey = new Map<string, string[]>();
        let scanned = 0;
        let truncated = false;
        for (let page = 1; page <= GUARD_MAX_PAGES; page++) {
            const query: Record<string, unknown> = { connection: connectionId, statuses: statuses.join(','), limit: GUARD_PAGE_SIZE, page: String(page), populate: 'person' };
            if (sectors?.length) query.sectors = sectors;
            const { results = [] } = await this.client.services.listServices({ query });
            for (const service of results) {
                scanned++;
                const person = service.person && typeof service.person === 'object' ? (service.person as { phones?: Array<{ phone?: unknown }> }) : null;
                for (const entry of person?.phones ?? []) {
                    const variants = phoneVariants(entry.phone);
                    for (const key of [variants.digits, variants.alternate]) {
                        if (!key) continue;
                        const bucket = byPhoneKey.get(key) ?? [];
                        bucket.push(service.id);
                        byPhoneKey.set(key, bucket);
                    }
                }
            }
            if (results.length < GUARD_PAGE_SIZE) break;
            if (page === GUARD_MAX_PAGES) truncated = true;
        }
        return { byPhoneKey, scanned, truncated };
    }

    /** Both 9th-digit shapes of a contact's phone in full (DDI-prefixed) form, for guard lookups. */
    private phoneKeys(contact: MassDispatchContact, defaultDdi: string): string[] {
        const digits = toDigits(contact.phone);
        const ddi = contact.ddi ?? defaultDdi;
        const full = digits.startsWith(ddi) ? digits : ddi + digits;
        const variants = phoneVariants(full);
        return [variants.digits, variants.alternate].filter(Boolean);
    }

    /** Creates the empty `fixed` segmentation the import populates and the campaign targets. */
    async createBatchSegmentation(spec: MassDispatchSpec): Promise<string> {
        const name = spec.name ?? 'mass-dispatch';
        const seg = (await this.client.segmentations.createSegmentation({
            name,
            description: name,
            type: 'person',
            result_type: 'fixed',
        })) as { id: string };
        return seg.id;
    }

    /**
     * Bulk-creates/updates the group's contacts under one owner and adds them to the
     * batch segmentation — a single multipart `import` call regardless of group size.
     */
    async importContacts(
        contacts: MassDispatchContact[],
        opts: { owner?: string; segmentationId: string; spec: MassDispatchSpec },
    ): Promise<void> {
        const columns = opts.spec.columns ?? DEFAULT_COLUMNS;
        const defaultDdi = opts.spec.defaultDdi ?? DEFAULT_DDI;
        const rows = contacts.map((contact) => this.contactRow(contact, columns, defaultDdi));
        const file = buildXlsx(columns, rows);

        const data: Record<string, unknown> = {
            segmentation: opts.segmentationId,
            update_duplicates: opts.spec.importOptions?.update_duplicates ?? true,
            allow_duplicates: opts.spec.importOptions?.allow_duplicates ?? false,
            add_duplicates_to_segmentation: 'todos',
        };
        if (opts.owner) data.user = opts.owner;

        await this.client.import.createImport(
            { data: file, filename: 'contacts.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
            { target: 'persons', data: JSON.stringify(data) },
        );
    }

    /**
     * Polls the segmentation counter until it reaches the expected size (imports are
     * async and take seconds to index). Returns the resolved audience count; if the
     * timeout elapses it returns whatever indexed so far — the caller decides.
     */
    async waitForAudience(
        segmentationId: string,
        expected: number,
        timeoutMs: number,
        sleep: (ms: number) => Promise<void>,
    ): Promise<number> {
        const deadline = timeoutMs / POLL_INTERVAL_MS;
        let last = 0;
        for (let attempt = 0; attempt < deadline; attempt++) {
            await sleep(POLL_INTERVAL_MS);
            const seg = (await this.client.segmentations.getSegmentation(segmentationId)) as { counter?: number };
            last = seg.counter ?? 0;
            if (last >= expected) return last;
        }
        return last;
    }

    /**
     * Bulk-settles attendances in one call, replacing the per-contact settle loop
     * (and doubling as the sweeper for leaked open attendances). Mirrors the studio's
     * "manage services" batch: `transfer` (assign a sector/user, with a reason) or
     * `finished`. The target is either an explicit id list or a datagrid-style filter
     * (e.g. `{ connection, statuses: ['in_attendance'] }`), so it is O(1) in the number
     * of attendances.
     * @remarks `services.batch` is Bearer-only (already in the strategy seed).
     */
    async settleAttendances(opts: {
        action: 'transfer' | 'finished';
        target: { ids: string[] } | Record<string, unknown>;
        sector?: string;
        user?: string;
        reason?: string;
    }): Promise<unknown> {
        const action: Record<string, unknown> = {};
        if (opts.sector) action.sector = opts.sector;
        if (opts.reason) action.reason = opts.reason;
        if (opts.user) action.user = opts.user;
        return this.client.services.batch({ type: opts.action, query: opts.target, action } as never);
    }

    /** Fires the single flow-less WhatsApp campaign over the batch segmentation. */
    async sendCampaign(opts: { segmentationId: string; spec: MassDispatchSpec }): Promise<unknown> {
        const spec = opts.spec;
        const body: Record<string, unknown> = {
            send_type: 'immediate',
            send_mode: 'fractional',
            type: 'whatsapp',
            name: spec.name ?? 'mass-dispatch',
            dispatch_config: spec.dispatchConfig ?? DEFAULT_PACING,
            types: ['whatsapp', 'gupshup'],
            connection: spec.connectionId,
            template: spec.templateId,
            variables: { body: spec.variables ?? [] },
            query: [{ type: 'in_segmentation', segmentation: opts.segmentationId }, { type: 'whatsapp' }],
            query_type: 'person',
        };
        if (spec.properties) body.properties = spec.properties;
        return this.client.campaigns.createCampaign(body);
    }

    /** Splits contacts into owner groups per the spec's owner mode. */
    private groupByOwner(contacts: MassDispatchContact[], spec: MassDispatchSpec): Array<{ owner?: string; contacts: MassDispatchContact[] }> {
        if (spec.owner.mode === 'single') {
            return [{ owner: spec.owner.userId, contacts }];
        }
        const byOwner = new Map<string, MassDispatchContact[]>();
        for (const contact of contacts) {
            const key = contact.owner ?? '';
            const bucket = byOwner.get(key) ?? [];
            bucket.push(contact);
            byOwner.set(key, bucket);
        }
        return [...byOwner.entries()].map(([owner, group]) => ({ owner: owner || undefined, contacts: group }));
    }

    /** Maps a contact onto the import sheet columns, splitting the DDI from the phone. */
    private contactRow(contact: MassDispatchContact, columns: string[], defaultDdi: string): string[] {
        const digits = String(contact.phone).replace(/\D/g, '');
        const ddi = contact.ddi ?? defaultDdi;
        const national = digits.startsWith(ddi) ? digits.slice(ddi.length) : digits;
        const slot: Record<string, string> = {
            name: contact.name,
            ddi,
            phone: national,
            email: contact.email ?? '',
            ssn: contact.ssn ?? '',
        };
        return columns.map((column) => slot[column.toLowerCase()] ?? '');
    }

    private async recordLedger(result: MassDispatchResult, spec: MassDispatchSpec): Promise<void> {
        if (!this.ledger) return;
        const entry: MassDispatchLedgerEntry = {
            segmentationId: result.segmentationId,
            campaignId: result.campaignId,
            connection: spec.connectionId,
            template: spec.templateId,
            imported: result.imported,
            audienceCount: result.audienceCount,
            ownerMap: result.ownerMap,
            status: result.status,
            guard: result.guard,
        };
        await this.ledger.record(entry);
    }
}
