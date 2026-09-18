/**
 * Turns request rows into serializable contacts with a first, network-free outcome, and
 * owns the single exclusion function every phase uses.
 */

import type { RosterIndex } from './request-validation';
import type { AdvisorResolution, ContactOutcome, DispatchContact, ExclusionCriteria, TargetOwner, WorkspaceDispatchRequest, WorkspaceDispatchRow } from './types';
import type { TemplateVariable } from './template-variables';
import { brazilianPhoneVariants, collapseWhitespace, hash64Hex, normalizeEmail, phoneIdentity } from '../../../utils';
import { formatBoundFields } from './template-variables';

/** Contacts of a request plus the audience fingerprint used against duplicate dispatches. */
export interface PreparedAudience {
    contacts: DispatchContact[];
    fingerprint: string;
}

/** Advisor column resolved against the roster and the unresolved-advisor policy. */
interface AdvisorAssignment {
    resolution: AdvisorResolution;
    target?: TargetOwner;
}

/**
 * Outcomes a contact may still be excluded from: waiting for its lookup, or resolved and
 * waiting for its writes. Both mean nothing has been written for it yet, which is what lets
 * the confirmed exclusion run take a contact out right before `materializing`.
 */
const EXCLUDABLE_OUTCOMES: readonly ContactOutcome[] = ['pendingLookup', 'ready'];

/** True when the exclusion leaves people out by report filter, which the exclusion phase resolves. */
export function excludesByFilter(exclusion: Pick<ExclusionCriteria, 'segmentationFilters'>): boolean {
    return exclusion.segmentationFilters.length > 0;
}

/**
 * Builds one contact per row, in index order; the first matching outcome wins:
 * `invalidPhone`, `repeatedPhone` (the first row with a phone keeps it), `missingName`,
 * `unresolvedAdvisor` (only under the `skip` policy), otherwise `pendingLookup`. The
 * explicit excluded phones are then applied with {@link excludeContacts}, and the
 * fingerprint is computed over the contacts left in `pendingLookup`.
 */
export function prepareAudience(request: WorkspaceDispatchRequest, roster: RosterIndex): PreparedAudience {
    const seenPhones = new Set<string>();
    const prepared = request.rows.map((row, index) => {
        const contact = contactOfRow(row, index, request, roster, seenPhones);

        if (contact.phone) {
            seenPhones.add(phoneIdentity(contact.phone));
        }

        return contact;
    });
    const contacts = excludeContacts(prepared, request.exclusion.phones);

    return { contacts, fingerprint: audienceFingerprint(request, contacts) };
}

/**
 * Marks as `excluded` every contact that has not been written to yet (see
 * {@link EXCLUDABLE_OUTCOMES}) whose phone identity matches an excluded phone, in either
 * 9th-digit shape. The only function that applies excluded phones, in any phase: the
 * explicit list at `plan` and each page the exclusion phase reads. An excluded value that
 * is not a valid Brazilian phone cannot match a contact and is ignored.
 */
export function excludeContacts(contacts: readonly DispatchContact[], excludedPhones: readonly string[]): DispatchContact[] {
    const excludedIdentities = new Set<string>();

    for (const excludedPhone of excludedPhones) {
        const variants = brazilianPhoneVariants(excludedPhone);

        if (variants) {
            excludedIdentities.add(phoneIdentity(variants));
        }
    }

    return contacts.map((contact) => (EXCLUDABLE_OUTCOMES.includes(contact.outcome) && contact.phone && excludedIdentities.has(phoneIdentity(contact.phone))
        ? { ...contact, outcome: 'excluded' }
        : contact));
}

/**
 * Fingerprint of an audience: a 64-bit hash of the connection, the template, what its
 * variables send and the sorted phone identities of the contacts in `pendingLookup`,
 * suffixed with their count. Independent of row order. The variables are part of it
 * because the message a typed literal produces is not the one another literal produces, so
 * two dispatches that differ only there are different dispatches for the duplicate guard.
 */
export function audienceFingerprint(request: Pick<WorkspaceDispatchRequest, 'connectionId' | 'templateId' | 'templateVariables'>, contacts: readonly DispatchContact[]): string {
    const identities = contacts
        .filter((contact) => contact.outcome === 'pendingLookup' && contact.phone)
        .map((contact) => phoneIdentity(contact.phone!))
        .sort();

    return `${hash64Hex([request.connectionId, request.templateId, variablesToken(request.templateVariables), ...identities].join('|'))}-${identities.length}`;
}

/** The variables' part of the fingerprint: origin, value and reformatting, in template order. */
function variablesToken(variables: readonly TemplateVariable[]): string {
    return variables
        .map((variable) => [variable.kind, variable.kind === 'personField' ? variable.fieldId : variable.value, ...variable.formats].join('~'))
        .join(',');
}

/** Builds the contact of one row. */
function contactOfRow(row: WorkspaceDispatchRow, index: number, request: WorkspaceDispatchRequest, roster: RosterIndex, seenPhones: ReadonlySet<string>): DispatchContact {
    const name = collapseWhitespace(row.name);
    const phone = brazilianPhoneVariants(row.phone);
    const advisor = assignAdvisor(row.advisorKey, request, roster);

    return {
        index,
        name,
        phone,
        advisorResolution: advisor.resolution,
        target: advisor.target,
        customFields: formatBoundFields(row.customFields, request.templateVariables),
        outcome: firstOutcome(name, phone === undefined ? undefined : phoneIdentity(phone), advisor, seenPhones),
        writesDone: 0,
        attempts: 0,
        createSends: 0,
    };
}

/** The first outcome that applies to a freshly read row. */
function firstOutcome(name: string, identity: string | undefined, advisor: AdvisorAssignment, seenPhones: ReadonlySet<string>): ContactOutcome {
    if (identity === undefined) {
        return 'invalidPhone';
    }

    if (seenPhones.has(identity)) {
        return 'repeatedPhone';
    }

    if (name === '') {
        return 'missingName';
    }

    if (!advisor.target) {
        return 'unresolvedAdvisor';
    }

    return 'pendingLookup';
}

/**
 * Resolves the advisor column: `missing` when empty, `notFound` when no user matches,
 * `systemUser` when the match is a system user, `matched` otherwise. Anything but
 * `matched` takes the reserve owner under `assignReserve` and no target under `skip`.
 */
function assignAdvisor(advisorKey: string, request: WorkspaceDispatchRequest, roster: RosterIndex): AdvisorAssignment {
    const key = advisorKey.trim();

    if (key === '') {
        return unresolvedAdvisor('missing', request);
    }

    const user = request.advisorKeyKind === 'email' ? roster.byEmail.get(normalizeEmail(key)) : roster.byId.get(key);

    if (!user) {
        return unresolvedAdvisor('notFound', request);
    }

    if (request.systemUserIds.includes(user.id)) {
        return unresolvedAdvisor('systemUser', request);
    }

    return { resolution: 'matched', target: { userId: user.id, source: 'advisor' } };
}

/** An unresolved advisor, with the reserve owner as target when the policy assigns one. */
function unresolvedAdvisor(resolution: AdvisorResolution, request: WorkspaceDispatchRequest): AdvisorAssignment {
    const policy = request.unresolvedAdvisorPolicy;

    if (policy.kind === 'assignReserve') {
        return { resolution, target: { userId: policy.reserveOwnerId, source: 'reserve' } };
    }

    return { resolution };
}
