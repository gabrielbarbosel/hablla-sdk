import type { HabllaClient } from '../../client';
import type { FlowDispatchContact, FlowDispatchConfig, FlowDispatchResult } from './types';
import type { MultipartBody } from '../../core/types';
import { buildXlsx } from './xlsx';
import { distributeOwners, toDigits, phoneVariants, hashString } from '../../utils';

/**
 * The 10 config columns the flow engine reads per audience row (the exact contract
 * copied from the legacy `dispatch()` bridge). Every row repeats the same resolved
 * values so the engine can act on each contact standalone.
 */
const CONFIG_COLUMNS = ['connection', 'template', 'on_atendimento', 'on_sem_cadastro', 'xp_field_id', 'tag', 'sector_id', 'advisors_json', 'var_need', 'finish_reason_id'];

/** The 4 fixed leading columns of the audience sheet, before the variable/extra/config columns. */
const FIXED_COLUMNS = ['phone', 'name', 'userId', 'owner_id'];

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DEFAULT_DDI = '55';

/**
 * Legacy flow dispatch orchestrator: materializes the audience as an `.xlsx` (the exact
 * column contract the flow engine consumes) and posts it to `campaigns/sheet` so the
 * platform runs the configured flow per contact. It owns every domain decision the thin
 * Apps Script bridge used to reimplement:
 *
 * 1. Suppression — drops contacts whose phone (9th-digit aware) is in `suppressPhones`.
 * 2. Owner distribution — `fixo` / `rodizio` / `aleatorio`, **deterministic** (never
 *    `Math.random`), via {@link distributeOwners}, into the fixed `owner_id` column.
 * 3. Audience assembly — the fixed + variable + extra + config columns, via
 *    {@link buildXlsx} (kills the SpreadsheetApp.create + export + Drive round-trip).
 * 4. The `campaigns/sheet` POST with the 500-circular workaround preserved: an explicit
 *    Bearer strategy, `type: 'flow'` + `flow`, and NO `dispatch_config`.
 *
 * The `campaigns/sheet` endpoint only works on Bearer (a workspace-token POST hits a
 * `500 "Converting circular structure to JSON"` and is never retried on Bearer because it
 * is a mutating method), so the call fixes `strategy: 'bearer'` — this reproduces the
 * legacy `dispatchSheetDirect_` request byte-for-byte through the SDK transport.
 */
export class FlowDispatch {
    constructor(private readonly client: HabllaClient) {}

    /**
     * Suppresses, distributes owners, builds the audience xlsx and fires the
     * flow campaign. Mirrors {@link MassDispatch.dispatchPersonalized}: the caller hands
     * over raw contacts plus a resolved {@link FlowDispatchConfig} and this owns the rest.
     * Returns `{ imported: 0, campaignId: undefined }` (without throwing) when everyone was
     * suppressed, leaving the "all suppressed" PT-BR message to the bridge.
     */
    async dispatchByFlow(contacts: FlowDispatchContact[], config: FlowDispatchConfig): Promise<FlowDispatchResult> {
        if (!config.connectionId) throw new Error('FlowDispatch: connectionId is required');
        if (!config.templateId) throw new Error('FlowDispatch: templateId is required');
        if (!config.sectorId) throw new Error('FlowDispatch: sectorId is required');
        if (!config.flowId) throw new Error('FlowDispatch: flowId is required');

        const received = contacts.length;
        const survivors = this.filterSuppressed(contacts, config.suppressPhones ?? [], config.defaultDdi ?? DEFAULT_DDI);
        const suppressed = received - survivors.length;

        if (survivors.length === 0) {
            return { campaignId: undefined, imported: 0, received, suppressed, ownerMap: {} };
        }

        const rng = config.rng ?? ((index: number) => hashString(toDigits(survivors[index]?.phone)));
        const owners = distributeOwners(survivors.length, config.ownerDistribution?.owners ?? [], config.ownerDistribution?.strategy ?? 'fixo', rng);
        const ownerMap: Record<string, number> = {};
        for (const owner of owners) {
            if (owner) ownerMap[owner] = (ownerMap[owner] ?? 0) + 1;
        }

        const header = [...FIXED_COLUMNS, ...config.variableColumns, ...config.extraColumns, ...CONFIG_COLUMNS];
        const configValues = [
            config.connectionId,
            config.templateId,
            config.onAttendance,
            config.onMissingContact,
            config.xpFieldId ?? '',
            config.tag ?? '',
            config.sectorId,
            config.advisorsJson ?? '{}',
            String(config.templateVarCount),
            config.finishReasonId ?? '',
        ];

        const rows = survivors.map((contact, index) => [
            String(contact.phone),
            String(contact.name),
            String(contact.advisorCode ?? ''),
            owners[index] ?? '',
            ...config.variableColumns.map((_, vi) => String(contact.variables?.[vi] ?? '')),
            ...config.extraColumns.map((headerKey) => String(contact.extras?.[headerKey] ?? '')),
            ...configValues,
        ]);

        const file = buildXlsx(header, rows);

        const body: MultipartBody = {
            kind: 'multipart',
            fields: { name: config.name ?? 'Disparo', type: 'flow', flow: config.flowId },
            files: { file: { data: file, filename: 'disparo.xlsx', contentType: XLSX_MIME } },
        };

        const campaign = await this.client.http.post('/v2/workspaces/{workspace_id}/campaigns/sheet', { body, strategy: 'bearer' });

        return { campaignId: (campaign as { id?: string })?.id, imported: survivors.length, received, suppressed, ownerMap };
    }

    /**
     * Drops contacts whose phone matches a suppressed one, comparing on both 9th-digit
     * shapes so a stored number and a given number that differ only by the extra 9 still
     * count as the same line.
     * @remarks Copied verbatim from {@link MassDispatch.filterSuppressed}. Intentional
     *   duplication — the live mass path is not refactored here; extract to `utils` later.
     */
    private filterSuppressed(contacts: FlowDispatchContact[], suppressPhones: string[], defaultDdi: string): FlowDispatchContact[] {
        if (!suppressPhones.length) return contacts;
        const blocked = new Set<string>();
        for (const phone of suppressPhones) {
            for (const key of this.suppressionKeys(phone, defaultDdi)) blocked.add(key);
        }
        return contacts.filter((contact) => !this.suppressionKeys(contact.phone, defaultDdi).some((key) => blocked.has(key)));
    }

    /**
     * Both 9th-digit shapes of a phone in full (DDI-prefixed) digits, for suppression matching.
     * @remarks Copied verbatim from {@link MassDispatch.suppressionKeys} — see {@link filterSuppressed}.
     */
    private suppressionKeys(phone: unknown, defaultDdi: string): string[] {
        const digits = toDigits(phone);
        if (!digits) return [];
        const full = digits.startsWith(defaultDdi) ? digits : defaultDdi + digits;
        const variants = phoneVariants(full);
        return [variants.digits, variants.alternate].filter(Boolean);
    }
}
