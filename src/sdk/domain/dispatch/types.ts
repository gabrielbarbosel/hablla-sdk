import type { ServiceStatusCode } from '../../resources/gen_enums';

/**
 * Contract for one dispatch run. Built by the caller (the Apps Script bridge) and
 * consumed by {@link Dispatch}. The engine is agnostic: every domain choice (which
 * fields feed which Hablla Person slot, synthetic emails, policies) is a parameter
 * here — nothing is hardcoded.
 */
export interface DispatchSpec {
    /** Hablla connection id the template is sent from. */
    connectionId: string;
    /** Hablla template id to send. */
    templateId: string;
    /** Hablla sector id the person/service belong to. */
    sectorId: string;
    /** Number of body variables the template expects ({{1}}..{{n}}). */
    templateVarCount: number;

    /** What to do when the person already has an open attendance. */
    openAttendance: 'skip' | 'finishAndSend';
    /** What to do when no person matches the phone. */
    missingContact: 'skip' | 'create';
    /** Hablla user id used as owner when the advisor cannot be resolved. */
    ownerFallbackUserId?: string;

    /** `$input` key holding the advisor code (e.g. the intranet user id). */
    advisorField: string;
    /** Advisor code → Hablla user (id + name), resolved once by the bridge. */
    advisors: Record<string, DispatchAdvisor>;

    /** Reason id used to finish the outbound attendance (e.g. "Mensagem de Disparo"). */
    finishReasonId?: string;

    /** How to build the Hablla Person from the record. */
    person: DispatchPersonSpec;
}

/** How the record maps onto a Hablla Person. Every reference is an `$input` key. */
export interface DispatchPersonSpec {
    /** `$input` key with the person name. */
    nameField: string;
    /** `$input` key with the phone. */
    phoneField: string;
    /** `$input` keys that already hold an email. */
    emailFields: string[];
    /** Rules that synthesize an email from a field value (e.g. `contas.xp`). */
    derivedEmails: DerivedEmailRule[];
    /** `cf_<id>` keys to copy as custom fields, or `'auto'` for every `cf_` in the record. */
    customFields: 'auto' | string[];
    /** `$input` key holding a tag to add, if any. */
    tagField?: string;
}

/** A resolved advisor: the Hablla user id plus a display name for observability. */
export interface DispatchAdvisor {
    id: string;
    name: string;
}

/** Builds `<accounts joined by separator>@<domain>` from a field's value. */
export interface DerivedEmailRule {
    /** `$input` key whose value holds the accounts (normal column or `cf_<id>`). */
    sourceField: string;
    separator: string;
    domain: string;
}

/** Outcome status of a single contact. Stable strings — consumed by the observability view. */
export type DispatchStatus =
    | 'enviado'
    | 'criado_enviado'
    | 'atendimento_encerrado_enviado'
    | 'em_atendimento'
    | 'sem_cadastro'
    | 'sem_assessor'
    | 'bloqueado'
    | 'telefone_invalido'
    | 'conexao_invalida'
    | 'template_invalido'
    | 'sem_setor'
    | 'variaveis_invalidas'
    | 'erro_envio';

/**
 * One contact to materialize (bulk-import) and then dispatch to. Only `name` and
 * `phone` are required; extra columns ride along in the import sheet. `owner` drives
 * per-contact owner assignment (see {@link MassDispatchSpec.owner}).
 */
export interface MassDispatchContact {
    name: string;
    /** National number, with or without the DDI — normalized against {@link ddi}. */
    phone: string;
    /** Country code prefix. Defaults to the spec's `defaultDdi` (e.g. `55`). */
    ddi?: string;
    email?: string;
    ssn?: string;
    /** Hablla user id that should own this contact (per-contact owner mode). */
    owner?: string;
}

/**
 * Contract for one mass dispatch: materialize an audience (one `import` per owner
 * group, O(1) in the number of contacts) and fire a single flow-less WhatsApp
 * campaign over it. The campaign attendance is born on the person's owner, so no
 * per-contact settle step is needed.
 */
export interface MassDispatchSpec {
    /** Hablla connection id the template is sent from. */
    connectionId: string;
    /** Hablla template id to send. */
    templateId: string;
    /**
     * Owner assignment. `single` imports everyone under one user (O(1), all
     * attendances land on that user). `perContact` groups by `contact.owner` and
     * runs one import per group (O(team-size), each attendance born on the right
     * owner — kills the settle/transfer step).
     */
    owner: { mode: 'single'; userId: string } | { mode: 'perContact' };
    /** Default DDI for contacts that omit it. Defaults to `55`. */
    defaultDdi?: string;
    /** Template body variables (literal or expression), applied to the whole campaign. */
    variables?: string[];
    /** Server-side pacing. Defaults to a conservative `{ batch_interval: 0.3, batch_size: 5 }`. */
    dispatchConfig?: { batch_interval: number; batch_size: number };
    /** Extra campaign `properties` passthrough (e.g. expression flags for variables). */
    properties?: Record<string, unknown>;
    /** Import sheet columns. Defaults to `['Name', 'DDI', 'Phone', 'Email', 'SSN']`. */
    columns?: string[];
    /** Import tuning. `update_duplicates` defaults to `true`. */
    importOptions?: { allow_duplicates?: boolean; update_duplicates?: boolean };
    /** Max time to wait for each import to index before sending. Defaults to 60s. */
    indexTimeoutMs?: number;
    /** Human label for the segmentation and campaign. Defaults to a timestamp-free tag. */
    name?: string;
    /**
     * What to do with contacts that already have an open attendance on
     * {@link connectionId} — the mass equivalent of the legacy dispatcher's
     * `openAttendance` policy. Off by default. See {@link AttendanceGuard}.
     */
    attendanceGuard?: AttendanceGuard;
}

/**
 * Pre-send guard against interrupting a live conversation. Before importing, the run
 * sweeps the open attendances on the dispatch connection (one paged `listServices`
 * per 50, scoped to the connection so it stays cheap — an attendance on another
 * channel is a different context) and matches them against the contacts by phone
 * (9th-digit aware). What it does with the matches is the {@link mode}:
 *
 * - `skip` — drop those contacts before import, so they never enter the audience.
 * - `finish` — bulk-close their open attendance ({@link MassDispatch.settleAttendances},
 *   one `services.batch` call) and then send.
 * - `off` — no guard (the default).
 *
 * This composes only proven primitives, so it never sends to someone mid-attendance
 * on a mistaken assumption — the failure mode a guessed audience filter would risk.
 */
export interface AttendanceGuard {
    mode: 'skip' | 'finish' | 'off';
    /** Attendance statuses that count as "busy". Defaults to `['in_attendance']` (matches the legacy policy). */
    statuses?: ServiceStatusCode[];
    /** Restrict the sweep to attendances in these sectors (optional). */
    sectors?: string[];
    /** Reason id used to close an attendance when `mode: 'finish'`. */
    finishReason?: string;
    /** Sector assigned when `mode: 'finish'` closes an attendance (optional). */
    finishSector?: string;
}

/** What the {@link AttendanceGuard} did on a run — surfaced in the result and ledger. */
export interface AttendanceGuardReport {
    mode: 'skip' | 'finish' | 'off';
    /** Open attendances scanned on the connection. */
    scannedOpen: number;
    /** Contacts matched to an open attendance. */
    matched: number;
    /** Contacts dropped from the audience (`skip` mode). */
    skipped: number;
    /** Attendances bulk-closed before sending (`finish` mode). */
    finished: number;
    /** True when the sweep hit its page cap and may be incomplete (never silently). */
    truncated: boolean;
}

/** A single audience-materialization + campaign, recorded for traceability. */
export interface MassDispatchLedgerEntry {
    segmentationId: string;
    campaignId?: string;
    connection: string;
    template: string;
    /** Contacts pushed through import. */
    imported: number;
    /** Audience size the segmentation resolved to at send time. */
    audienceCount: number;
    /** Owner id → number of contacts imported under it. */
    ownerMap: Record<string, number>;
    status: string;
    /** What the attendance guard did, when one ran. */
    guard?: AttendanceGuardReport;
}

/**
 * Persistence port (DIP) for the dispatch ledger — the canonical dispatch↔audience
 * record. A runtime provides the sink (the workspace writes it to a sheet tab via
 * the store); the SDK stays agnostic. `createdAt` is stamped by the sink, not here,
 * so the domain layer needs no clock.
 */
export interface DispatchLedger {
    record(entry: MassDispatchLedgerEntry): Promise<void>;
}

/** What {@link MassDispatch.run} returns. */
export interface MassDispatchResult {
    segmentationId: string;
    campaignId?: string;
    imported: number;
    audienceCount: number;
    ownerMap: Record<string, number>;
    status: string;
    /** What the attendance guard did, when one ran. */
    guard?: AttendanceGuardReport;
}

/** What {@link Dispatch.run} returns for one contact. `assessor` is the advisor name (observability). */
export interface DispatchResult {
    status: DispatchStatus;
    phone?: string;
    person?: string;
    /**
     * Id of the outbound attendance this dispatch settled (or the open one it hit). This is
     * the durable dispatch→attendance link: the caller can persist it so traceability is an
     * exact id join instead of a phone+time-window reconstruction. Absent when no service
     * was created/found (e.g. `sem_cadastro`, `telefone_invalido`).
     */
    service?: string;
    assessor?: string;
    detail?: string;
    created?: boolean;
}
