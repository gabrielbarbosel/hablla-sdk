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

/** What {@link Dispatch.run} returns for one contact. `assessor` is the advisor name (observability). */
export interface DispatchResult {
    status: DispatchStatus;
    phone?: string;
    person?: string;
    assessor?: string;
    detail?: string;
    created?: boolean;
}
