import type { PhoneVariants } from '../../../utils';

/** Which Hablla user attribute the advisor column of the audience holds. */
export type AdvisorKeyKind = 'email' | 'userId';

/** One audience line as the operator's sheet provides it. */
export interface WorkspaceDispatchRow {
    /** Full contact name; stored upper-cased on creation and the source of the first name. */
    name: string;
    /** Brazilian phone, with or without the 55 country code. */
    phone: string;
    /** Advisor identifier interpreted per {@link WorkspaceDispatchRequest.advisorKeyKind}; empty when absent. */
    advisorKey: string;
    /** Person custom-field values by custom-field id, written only when the person is created. */
    customFields: Readonly<Record<string, string>>;
}

/** Operator-chosen pacing, in the units the UI shows. */
export interface DispatchPacing {
    /** Contacts per server-side batch; integer >= 1. */
    batchSize: number;
    /** Seconds between batches; integer >= 1. Converted to minutes only by `toDispatchConfig`. */
    intervalSeconds: number;
}

/**
 * A report filter as the segmentation query builder emits it. Only `type` is interpreted
 * here; the remaining keys travel to Hablla untouched.
 */
export interface SegmentationFilter {
    readonly type: string;
    readonly [attribute: string]: unknown;
}

/** Everyone the operator chose to leave out. */
export interface ExclusionCriteria {
    /** Explicit phones (e.g. already-sent contacts). */
    phones: readonly string[];
    /**
     * Report filters whose matching persons are excluded. Must be empty until the way a
     * filter exclusion is resolved is decided; a non-empty list is refused by validation
     * instead of being silently ignored.
     */
    segmentationFilters: readonly SegmentationFilter[];
}

/** Audit summary of the exclusion kept in the job (the phone list itself is not persisted). */
export interface ExclusionSummary {
    phoneCount: number;
    segmentationFilters: readonly SegmentationFilter[];
}

/** What to do with an existing person whose only owners are system users. */
export type SystemOwnerPolicy = 'replace' | 'add';

/** What to do with a contact whose advisor cannot be resolved to a human Hablla user. */
export type UnresolvedAdvisorPolicy =
    | { kind: 'assignReserve'; reserveOwnerId: string }
    | { kind: 'skip' };

/** Everything one dispatch needs; built by the app from typed config plus operator choices. */
export interface WorkspaceDispatchRequest {
    /** Human label used in the segmentation and campaign names. */
    label: string;
    connectionId: string;
    /** Approved WhatsApp template with exactly one body variable (the first name). */
    templateId: string;
    /** Sector assigned to persons created by this dispatch. */
    sectorId: string;
    /** Person custom field (target person, type string) that carries the computed first name; from typed config, never created here. */
    firstNameFieldId: string;
    advisorKeyKind: AdvisorKeyKind;
    /** Hablla user ids treated as system owners (e.g. Martech, Kras). */
    systemUserIds: readonly string[];
    systemOwnerPolicy: SystemOwnerPolicy;
    unresolvedAdvisorPolicy: UnresolvedAdvisorPolicy;
    exclusion: ExclusionCriteria;
    pacing: DispatchPacing;
    /** Set only when the operator explicitly confirmed re-sending a completed job with the same fingerprint. */
    repeatOfJobId?: string;
    rows: readonly WorkspaceDispatchRow[];
}

/** The request as persisted in the job: rows live as contacts, exclusions as outcomes plus a summary. */
export type DispatchSettings = Omit<WorkspaceDispatchRequest, 'rows' | 'exclusion'>;

/**
 * Every per-contact outcome, stable codes read by the app (which owns the PT-BR labels),
 * and the source of {@link ContactOutcome} and of the outcome counts.
 * Transitional: `pendingLookup`, `ready`. Every other value is terminal.
 */
export const CONTACT_OUTCOMES = [
    'invalidPhone',
    'repeatedPhone',
    'excluded',
    'missingName',
    'unresolvedAdvisor',
    'pendingLookup',
    'lookupFailed',
    'inAttendance',
    'duplicatePersons',
    'blocked',
    'noWhatsapp',
    'repeatedPerson',
    'ready',
    'writeFailed',
    'inAudience',
] as const;

/** Per-contact outcome; see {@link CONTACT_OUTCOMES}. */
export type ContactOutcome = (typeof CONTACT_OUTCOMES)[number];

/** How the advisor column resolved; shown in the drill-down. */
export type AdvisorResolution = 'matched' | 'missing' | 'notFound' | 'systemUser';

/** Where the owner assigned to a contact came from. */
export type OwnerSource = 'advisor' | 'reserve';

/** The Hablla user that should own the contact, with provenance. */
export interface TargetOwner {
    userId: string;
    source: OwnerSource;
}

/** Owner mutation decided for an existing person (see `decideOwnerChange`). */
export type OwnerChange =
    | { kind: 'keep' }
    | { kind: 'assign'; unfollowFirst: boolean }
    | { kind: 'replaceSystemOwners'; unfollowFirst: boolean; removedOwnerIds: readonly string[] }
    | { kind: 'addBesideSystemOwners'; unfollowFirst: boolean };

/** The person a contact resolved to. */
export interface ResolvedPerson {
    id: string;
    /** False when this dispatch created it. */
    existed: boolean;
}

/** Which resolution produced the contact's current `person`/`ownerChange`. */
export type LookupPurpose = 'preview' | 'send';

/** Non-idempotent write whose intent was persisted before sending. */
export type PendingWrite = 'createPerson' | 'joinAudience';

/** Why a contact's last call failed, for the drill-down. */
export interface ContactFailure {
    status: number | 'transport';
    detail: string;
}

/** Serializable per-contact state of a job. */
export interface DispatchContact {
    /** Position in the request rows; stable identity inside the job. */
    index: number;
    /** Name as given (trimmed, whitespace collapsed). */
    name: string;
    /** Absent when the phone is invalid. */
    phone?: PhoneVariants;
    /** Computed first name written to the configured custom field. */
    firstName: string;
    advisorResolution: AdvisorResolution;
    target?: TargetOwner;
    customFields: Readonly<Record<string, string>>;
    outcome: ContactOutcome;
    person?: ResolvedPerson;
    ownerChange?: OwnerChange;
    /** When and for what the last complete lookup ran. */
    resolvedAt?: number;
    lookupPurpose?: LookupPurpose;
    /** Number of planned writes already confirmed (see `planContactWrites`). */
    writesDone: number;
    /** Attempts spent on the current read or write. */
    attempts: number;
    /** `createPerson` sends already made for this contact (bounded by `MAX_CREATE_SENDS`). */
    createSends: number;
    /** Write-ahead marker: set before sending, cleared once the outcome is known. */
    pendingWrite?: PendingWrite;
    /** Epoch ms before which the contact is not processed again (retry or reconciliation delay). */
    retryNotBefore?: number;
    /** Segmentation item id returned by `joinAudience`. */
    audienceItemId?: string;
    failure?: ContactFailure;
}

/** Phases a `continue` works on and a failed job may re-enter; the source of {@link ResumePhase}. */
export const RESUMABLE_PHASES = ['resolving', 'materializing', 'awaitingAudience', 'sending'] as const;

/** Phase a failed job re-enters on `start`; see {@link RESUMABLE_PHASES}. */
export type ResumePhase = (typeof RESUMABLE_PHASES)[number];

/** Phase of a dispatch job; `awaitingConfirmation` waits for the operator, the last four are over. */
export type DispatchJobPhase = ResumePhase | 'awaitingConfirmation' | 'completed' | 'failed' | 'superseded' | 'abandoned';

/** Phases whose work is done contact by contact, in chunks. */
export type ChunkedPhase = 'resolving' | 'materializing';

export type JobFailureReason =
    | 'workspace_token_rejected'
    | 'bearer_token_rejected'
    | 'audience_timeout'
    | 'audience_query_rejected'
    | 'audience_mismatch'
    | 'campaign_rejected'
    | 'campaign_outcome_unknown';

/** Failure of a job; `start` re-enters `resumePhase`, `abandon` ends it. Every failure is resumable. */
export interface JobFailure {
    reason: JobFailureReason;
    detail: string;
    resumePhase: ResumePhase;
}

/** Something that happened after the point of no return and needs a human look. */
export type JobWarning =
    | { kind: 'campaignQuantityMismatch'; campaignQuantity: number; audienceSize: number }
    | { kind: 'campaignQuantityUnverified'; audienceSize: number; detail: string };

/** Serializable job header (contacts are stored apart, by index). */
export interface DispatchJob {
    id: string;
    /** Compare-and-set token; the store increments it on every update. */
    revision: number;
    fingerprint: string;
    settings: DispatchSettings;
    exclusion: ExclusionSummary;
    phase: DispatchJobPhase;
    createdAt: number;
    updatedAt: number;
    contactCount: number;
    /** Next contact index for the chunked phases. */
    cursor: number;
    /** Pass over the contacts inside the current chunked phase (deferred contacts are picked up by the next pass). */
    pass: number;
    /** Earliest `retryNotBefore` of the contacts deferred during the current pass. */
    passDeferredUntil?: number;
    counts: Readonly<Record<ContactOutcome, number>>;
    /** Contacts that left `ready` at the send-time lookup, by the outcome they moved to. */
    revalidationShifts: Readonly<Partial<Record<ContactOutcome, number>>>;
    /** Rounds interrupted in a row (see `trackInterruptedRounds`); reset by the first round that is not. */
    consecutiveInterruptedRounds: number;
    startedBy?: string;
    startedAt?: number;
    segmentationId?: string;
    audienceDeadlineAt?: number;
    audienceSize?: number;
    /** Last count read while waiting for the audience (for the timeout detail). */
    lastAudienceCount?: number;
    /**
     * Write-ahead for the campaign POST: `inFlight` while its outcome is unknown, `sent`
     * once the creation answered and only the campaign's audience quantity is still to be read.
     */
    campaignSendState?: 'inFlight' | 'sent';
    campaignReconcileNotBefore?: number;
    /** Attempts spent reading the campaign back. */
    campaignReconcileAttempts?: number;
    campaignId?: string;
    /** `quantity` read back from the campaign; the creation response reports 0 and is never read. */
    campaignQuantity?: number;
    dispatchConfig?: HabllaDispatchConfig;
    failure?: JobFailure;
    warnings: readonly JobWarning[];
    abandonedBy?: string;
    abandonedAt?: number;
    /** Epoch ms until which a `continue` holds the job. */
    leaseUntil?: number;
}

/** Hablla's campaign pacing shape (`batch_interval` in minutes). */
export interface HabllaDispatchConfig {
    batch_size: number;
    batch_interval: number;
}

/** What the caller should do after a call returns. */
export type DispatchNextStep =
    | { kind: 'continueAfter'; delayMs: number }
    | { kind: 'awaitConfirmation' }
    | { kind: 'finished' };

/** A job with the step its caller should take next. */
export interface DispatchProgress {
    job: DispatchJob;
    next: DispatchNextStep;
}

/** A page of the per-contact drill-down. */
export interface DispatchJobView extends DispatchProgress {
    contacts: readonly DispatchContact[];
}

/** A window over a job's contacts, for the drill-down. */
export interface ContactPage {
    offset: number;
    limit: number;
}

/** Absolute execution window, computed once by the runtime at the start of the execution. */
export interface ContinueOptions {
    /** No chunk starts unless it can finish before this epoch ms. */
    deadlineAt: number;
    /** Lease written on the job; must be later than `deadlineAt`. */
    leaseUntil: number;
}

/** Who is acting on the job; recorded on the job. */
export interface OperatorOptions {
    operatorEmail: string;
}

/** Limits from the app's typed config; each one has a default (see `resolveDispatchLimits`). */
export interface WorkspaceDispatchLimits {
    /**
     * Upper bound of HTTP calls one dispatch may need (GAS: the account's daily UrlFetch
     * quota); defaults to `GOOGLE_WORKSPACE_DAILY_CALL_QUOTA`.
     */
    dailyCallQuota?: number;
    /**
     * Pages of excluded persons one exclusion run may read; defaults to
     * `DEFAULT_MAX_EXCLUSION_PAGES`.
     */
    maxExclusionPages?: number;
}

/** One custom-field value, as the person routes take it. */
export interface CustomFieldValue {
    custom_field: string;
    value: string;
}

/** A phone of a person created by the dispatch. */
export interface PersonPhoneBody {
    phone: string;
    is_whatsapp: boolean;
    type: string;
}

/** Person creation body (v1 persons). */
export interface PersonCreateBody {
    /** Full name, upper-cased; only a person the dispatch creates gets a name from a row. */
    name: string;
    phones: readonly PersonPhoneBody[];
    /** Owners of the person; the route replaces nothing, it creates. */
    users: readonly string[];
    sectors: readonly string[];
    custom_fields: readonly CustomFieldValue[];
}

/** Person update body; `custom_fields` merge by id, so only the given ids change. */
export interface PersonUpdateBody {
    custom_fields: readonly CustomFieldValue[];
}

/** Persisted-shape segmentation creation body. */
export interface SegmentationCreateBody {
    name: string;
    description: string;
    type: 'person';
    result_type: 'fixed';
}

/** Campaign v2 creation body, as validated by probe 04. */
export interface CampaignCreateBody {
    send_type: 'immediate';
    send_mode: 'fractional';
    type: 'whatsapp';
    name: string;
    dispatch_config: HabllaDispatchConfig;
    types: readonly ['whatsapp', 'gupshup'];
    connection: string;
    template: string;
    arrayFilter: readonly SegmentationFilter[];
    query: readonly SegmentationFilter[];
    query_type: 'person';
    variables: { body: readonly [string] };
    properties: { variables: { whatsapp: { components: { examples: { body: { '0_is_expression': false } } } } } };
}
