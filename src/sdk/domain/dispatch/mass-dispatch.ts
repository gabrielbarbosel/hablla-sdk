import type { HabllaClient } from '../../client';
import type {
    MassDispatchContact,
    MassDispatchSpec,
    MassDispatchResult,
    MassDispatchLedgerEntry,
    MassDispatchPersonalization,
    DispatchPersonalizedConfig,
    PersonalizedDispatchResult,
    RawDispatchContact,
    AttendanceGuard,
    AttendanceGuardReport,
    DispatchLedger,
} from './types';
import { buildXlsx } from './xlsx';
import { phoneVariants, toDigits, firstName, hashString, distributeOwners } from '../../utils';
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
 * The "Primeiro Nome" person custom field the first-name personalization writes to.
 * `fallbackId` is the id observed in the target workspace; the orchestrator prefers
 * the live id it resolves and only falls back to this expectation.
 */
const FIRST_NAME_FIELD = { name: 'Primeiro Nome', stdName: 'cf_primeiro_nome', type: 'string', target: 'person', fallbackId: '6a58642a4d7c0aa11db4d93e' };
const CUSTOM_FIELD_PAGE_LIMIT = 50;
const CUSTOM_FIELD_MAX_PAGES = 40;

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
     * High-level, batteries-included dispatch: the single entry point a thin runtime
     * (the Apps Script bridge) calls. It owns every domain decision so the caller only
     * hands over raw contacts plus a {@link DispatchPersonalizedConfig}. In order it:
     *
     * 1. Suppresses — drops contacts whose phone (9th-digit aware) is in `suppressPhones`.
     * 2. Distributes owners — `fixo` / `rodizio` / `aleatorio` (deterministic, never
     *    `Math.random`) sets `contact.owner` for a uniform `perContact` import path.
     * 3. Pre-computes the first name and ensures the "Primeiro Nome" custom field exists
     *    (resolving its live id), so body variable 0 is personalized per contact.
     * 4. Assembles the {@link MassDispatchSpec} and delegates to the agnostic {@link run}.
     *
     * @param sleep injectable delay (ms) — forwarded to {@link run} for the isolate.
     */
    async dispatchPersonalized(
        contacts: RawDispatchContact[],
        config: DispatchPersonalizedConfig,
        sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    ): Promise<PersonalizedDispatchResult> {
        if (!config.connectionId) throw new Error('dispatchPersonalized: connectionId is required');
        if (!config.templateId) throw new Error('dispatchPersonalized: templateId is required');

        const received = contacts.length;
        const survivors = this.filterSuppressed(contacts, config.suppressPhones ?? [], config.defaultDdi ?? DEFAULT_DDI);
        const suppressed = received - survivors.length;

        const enriched: MassDispatchContact[] = survivors.map((contact) => ({
            name: contact.name,
            phone: contact.phone,
            ddi: contact.ddi,
            owner: contact.owner,
        }));

        this.assignOwners(enriched, config);

        const personalizeFirstName = config.personalizeFirstName ?? true;
        const varCount = config.templateVarCount ?? (config.variables?.length ?? 0);
        let personalization: MassDispatchPersonalization[] | undefined;
        if (personalizeFirstName && varCount >= 1 && enriched.length) {
            const field = await this.ensureFirstNameField();
            for (const contact of enriched) {
                contact.customFields = { ...contact.customFields, [field.id]: firstName(contact.name) };
            }
            personalization = [{ field, templateIndex: 0 }];
        }

        const spec: MassDispatchSpec = {
            connectionId: config.connectionId,
            templateId: config.templateId,
            owner: { mode: 'perContact' },
            sectorId: config.sectorId,
            name: config.name,
            defaultDdi: config.defaultDdi,
            dispatchConfig: config.dispatchConfig,
            attendanceGuard: config.attendanceGuard,
            personalization,
        };
        if (varCount >= 1) {
            spec.variables = Array.from({ length: varCount }, (_, index) => config.variables?.[index] ?? '');
        }

        if (!enriched.length) {
            const empty: PersonalizedDispatchResult = { segmentationId: '', imported: 0, audienceCount: 0, ownerMap: {}, status: 'empty_audience', received, suppressed };
            return empty;
        }

        const result = await this.run(enriched, spec, sleep);
        return { ...result, received, suppressed };
    }

    /**
     * Drops contacts whose phone matches a suppressed one, comparing on both 9th-digit
     * shapes (the same variance the attendance guard handles) so a stored number and a
     * given number that differ only by the extra 9 still count as the same line.
     */
    private filterSuppressed(contacts: RawDispatchContact[], suppressPhones: string[], defaultDdi: string): RawDispatchContact[] {
        if (!suppressPhones.length) return contacts;
        const blocked = new Set<string>();
        for (const phone of suppressPhones) {
            for (const key of this.suppressionKeys(phone, defaultDdi)) blocked.add(key);
        }
        return contacts.filter((contact) => !this.suppressionKeys(contact.phone, contact.ddi ?? defaultDdi).some((key) => blocked.has(key)));
    }

    /** Both 9th-digit shapes of a phone in full (DDI-prefixed) digits, for suppression matching. */
    private suppressionKeys(phone: unknown, defaultDdi: string): string[] {
        const digits = toDigits(phone);
        if (!digits) return [];
        const full = digits.startsWith(defaultDdi) ? digits : defaultDdi + digits;
        const variants = phoneVariants(full);
        return [variants.digits, variants.alternate].filter(Boolean);
    }

    /**
     * Sets `contact.owner` for every contact per the distribution strategy. `aleatorio`
     * is made deterministic by hashing each contact's phone (stable across runs) unless
     * the caller injects its own `rng`. With no distribution, contacts keep any owner
     * they arrived with.
     */
    private assignOwners(contacts: MassDispatchContact[], config: DispatchPersonalizedConfig): void {
        const distribution = config.ownerDistribution;
        if (!distribution || !distribution.owners.length) return;
        const rng = config.rng ?? ((index: number) => hashString(toDigits(contacts[index]?.phone)));
        const owners = distributeOwners(contacts.length, distribution.owners, distribution.strategy, rng);
        contacts.forEach((contact, index) => {
            if (owners[index]) contact.owner = owners[index];
        });
    }

    /**
     * Resolves the "Primeiro Nome" person custom field, creating it (type `string`) if
     * it does not exist. Prefers the live id it finds over the hardcoded fallback, so a
     * workspace that recreated the field still lands on the right one.
     */
    async ensureFirstNameField(): Promise<{ id: string; stdName: string; type: string }> {
        for (let page = 1; page <= CUSTOM_FIELD_MAX_PAGES; page++) {
            const res = await this.client.customFields.listCustomFields({ query: { target: FIRST_NAME_FIELD.target, limit: CUSTOM_FIELD_PAGE_LIMIT, page: String(page) } });
            const rows = res.results ?? [];
            const existing = rows.find(
                (field) => field.std_name === FIRST_NAME_FIELD.stdName || field.name === FIRST_NAME_FIELD.name,
            );
            if (existing?.id) {
                return { id: existing.id, stdName: existing.std_name ?? FIRST_NAME_FIELD.stdName, type: existing.type ?? FIRST_NAME_FIELD.type };
            }
            if (rows.length < CUSTOM_FIELD_PAGE_LIMIT) break;
        }
        const created = await this.client.customFields.createCustomField({
            name: FIRST_NAME_FIELD.name,
            std_name: FIRST_NAME_FIELD.stdName,
            type: FIRST_NAME_FIELD.type,
            target: FIRST_NAME_FIELD.target,
        });
        return { id: created?.id ?? FIRST_NAME_FIELD.fallbackId, stdName: FIRST_NAME_FIELD.stdName, type: FIRST_NAME_FIELD.type };
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
     * When {@link MassDispatchSpec.personalization} is set, one extra column per binding
     * (`${stdName}_${type}`) rides along carrying each contact's custom-field value.
     */
    async importContacts(
        contacts: MassDispatchContact[],
        opts: { owner?: string; segmentationId: string; spec: MassDispatchSpec },
    ): Promise<void> {
        const standardColumns = opts.spec.columns ?? DEFAULT_COLUMNS;
        const defaultDdi = opts.spec.defaultDdi ?? DEFAULT_DDI;
        const customColumns = (opts.spec.personalization ?? []).map((entry) => ({
            header: `${entry.field.stdName}_${entry.field.type}`,
            fieldId: entry.field.id,
        }));
        const columns = [...standardColumns, ...customColumns.map((column) => column.header)];
        const rows = contacts.map((contact) => [
            ...this.contactRow(contact, standardColumns, defaultDdi),
            ...customColumns.map((column) => contact.customFields?.[column.fieldId] ?? ''),
        ]);
        const file = buildXlsx(columns, rows);

        const data: Record<string, unknown> = {
            segmentation: opts.segmentationId,
            update_duplicates: opts.spec.importOptions?.update_duplicates ?? true,
            allow_duplicates: opts.spec.importOptions?.allow_duplicates ?? false,
            add_duplicates_to_segmentation: 'todos',
        };
        if (opts.owner) data.user = opts.owner;
        if (opts.spec.sectorId) data.sector = opts.spec.sectorId;

        await this.client.import.createImport(
            { data: file, filename: 'contacts.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
            { target: 'persons', data: JSON.stringify(data) },
        );
    }

    /**
     * Polls the segmentation's campaign-resolvable audience until it reaches the
     * expected size. Uses the same audience resolver the campaign does (the alloy
     * `segmentations/count` endpoint), NOT the segmentation `counter` field: the
     * `counter` is stale for freshly-imported fixed segmentations (it lags or never
     * updates), so a campaign created the moment `counter` reports the size still
     * resolves an empty audience and fails. The alloy count only becomes non-zero
     * once the members are actually query-resolvable, so it is the correct gate
     * before {@link sendCampaign}. Returns the resolved count; on timeout it returns
     * whatever resolved so far and the caller decides.
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
            last = await this.resolveAudienceCount(segmentationId);
            if (last >= expected) return last;
        }
        return last;
    }

    /**
     * The campaign-resolvable audience size of a segmentation, via the alloy count
     * endpoint (the same resolver the campaign query uses). This is the source of
     * truth for "is the audience ready to dispatch", unlike the segmentation counter.
     */
    async resolveAudienceCount(segmentationId: string): Promise<number> {
        try {
            const res = (await this.client.http.post('/v1/workspaces/{workspace_id}/reports/alloy-reports/segmentations/count', {
                body: { filters: [{ type: 'in_segmentation', segmentation: segmentationId }] },
            })) as { count?: number };
            return res?.count ?? 0;
        } catch {
            // While a fresh segmentation is still indexing, this endpoint returns a
            // transient 500 ("Erro ao resolver segmentações"). Treat it as "not ready
            // yet" (count 0) so the caller keeps polling instead of aborting the run.
            return 0;
        }
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

    /**
     * Fires the single flow-less WhatsApp campaign over the batch segmentation, using
     * the exact v2 body the studio sends. Each template body variable is either a fixed
     * literal (from {@link MassDispatchSpec.variables}) or, when covered by
     * {@link MassDispatchSpec.personalization}, the token `{{person.custom_fields.<id>}}`
     * so the campaign resolves that slot per person. `properties.…examples.body` carries
     * one `<index>_is_expression: false` per variable (these are field tokens, not
     * campaign expressions). {@link HabllaClient.campaigns.createCampaign} posts to the
     * `POST /v2/workspaces/{workspace_id}/campaigns` endpoint the recipe requires.
     */
    async sendCampaign(opts: { segmentationId: string; spec: MassDispatchSpec }): Promise<unknown> {
        const spec = opts.spec;
        const personalization = spec.personalization ?? [];
        const fixed = spec.variables ?? [];
        const length = personalization.reduce((max, entry) => Math.max(max, entry.templateIndex + 1), fixed.length);

        const bodyVariables: string[] = [];
        const examples: Record<string, boolean> = {};
        for (let index = 0; index < length; index++) {
            const personalized = personalization.find((entry) => entry.templateIndex === index);
            bodyVariables.push(personalized ? `{{person.custom_fields.${personalized.field.id}}}` : (fixed[index] ?? ''));
            examples[`${index}_is_expression`] = false;
        }

        const body: Record<string, unknown> = {
            send_type: 'immediate',
            send_mode: 'fractional',
            type: 'whatsapp',
            name: spec.name ?? 'mass-dispatch',
            dispatch_config: spec.dispatchConfig ?? DEFAULT_PACING,
            types: ['whatsapp', 'gupshup'],
            connection: spec.connectionId,
            template: spec.templateId,
            arrayFilter: [{ type: 'in_segmentation', segmentation: opts.segmentationId }],
            query: [{ type: 'in_segmentation', segmentation: opts.segmentationId }, { type: 'whatsapp' }],
            query_type: 'person',
            variables: { body: bodyVariables },
            properties: spec.properties ?? { variables: { whatsapp: { components: { examples: { body: examples } } } } },
        };
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
