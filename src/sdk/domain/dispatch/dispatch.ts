import type { HabllaClient } from '../../client';
import type { DispatchSpec, DispatchResult, DispatchAdvisor } from './types';
import { phoneVariants, matchesPhone, isEmail, deriveEmail, collectIndexed, customFieldKeys } from '../../utils';
import type { PhoneVariants } from '../../utils';

/**
 * Runs one dispatch per contact inside the flow isolate. Agnostic executor of a
 * {@link DispatchSpec}: it builds Hablla `Person`/`Service` objects in Hablla's own
 * nomenclature and applies our policies. Never throws raw — every contact returns a
 * {@link DispatchResult} with a stable status.
 *
 * All generic helpers (phone shapes, email synthesis, record parsing) come from the
 * central `utils` layer; this class holds only business rules.
 *
 * Fixes baked in (from the tool audit): the outbound attendance is assigned to the
 * advisor and finished with a reason (so it never lingers under the connection's
 * bot user); the open-attendance lookup is skipped for freshly created persons;
 * person lookup uses the dedicated `phone` query.
 */
export class Dispatch {
    constructor(private readonly client: HabllaClient) {}

    async run(input: Record<string, unknown>, spec: DispatchSpec): Promise<DispatchResult> {
        const phone = String(input[spec.person.phoneField] ?? '');

        if (!spec.connectionId) return { status: 'conexao_invalida', phone };
        if (!spec.templateId) return { status: 'template_invalido', phone };
        if (!spec.sectorId) return { status: 'sem_setor', phone };

        const variants = phoneVariants(phone);
        if (variants.digits.length < 12) return { status: 'telefone_invalido', phone };

        let person = await this.findPerson(variants);
        if (person?.is_blocked) return { status: 'bloqueado', phone };

        const advisor = this.resolveAdvisor(person, input, spec);

        let created = false;
        if (!person) {
            if (spec.missingContact === 'skip') return { status: 'sem_cadastro', phone };
            if (!advisor) return { status: 'sem_assessor', phone };
            person = await this.createPerson(input, spec, advisor.id);
            created = true;
        } else if (advisor && !(person.users ?? []).length) {
            try {
                await this.client.persons.addUsers(person.id, { users: [advisor.id] });
            } catch (error) {
            }
        }

        let closedExisting = false;
        if (!created) {
            const { results: open } = await this.client.services.listServices({ query: { limit: 50, connection: spec.connectionId, person: person.id, status: 'in_attendance' } });
            if (open?.length) {
                if (spec.openAttendance === 'finishAndSend') {
                    for (const service of open) {
                        try {
                            await this.client.services.patchAction(service.id, { status: 'finished', reason: spec.finishReasonId });
                        } catch (error) {
                        }
                    }
                    closedExisting = true;
                } else {
                    return { status: 'em_atendimento', person: person.id, assessor: advisor?.name };
                }
            }
        }

        const variables = collectIndexed(input, 'var');
        if (variables.length < spec.templateVarCount) return { status: 'variaveis_invalidas', phone, assessor: advisor?.name };

        const destinationKey = this.destinationKey(person, variants, phone);

        try {
            await this.client.messages.createConnectionsMessagesTemplates(spec.connectionId, {
                examples: { body: spec.templateVarCount ? variables.slice(0, spec.templateVarCount) : [], header: [] },
                template: spec.templateId,
                sector: spec.sectorId,
                to: { key: destinationKey, type: 'whatsapp', person: person.id },
            });

            if (spec.person.tagField && input[spec.person.tagField]) {
                try {
                    await this.client.persons.addTags(person.id, { tags: [String(input[spec.person.tagField])] });
                } catch (error) {
                }
            }

            await this.settleAttendance(person.id, spec, advisor?.id);

            return { status: created ? 'criado_enviado' : closedExisting ? 'atendimento_encerrado_enviado' : 'enviado', person: person.id, assessor: advisor?.name, created };
        } catch (error: any) {
            if (error && (error.status === 409 || /\b(?:136|409)\b/.test(String(error.message)))) {
                return { status: 'em_atendimento', person: person.id, assessor: advisor?.name };
            }
            return { status: 'erro_envio', phone, detail: String(error && error.message).slice(0, 120), person: person.id };
        }
    }

    /** Finds a person by the dedicated `phone` query, trying both phone shapes. */
    private async findPerson(variants: PhoneVariants): Promise<any | undefined> {
        const owns = (candidate: any) => (candidate.phones ?? []).some((entry: any) => matchesPhone(entry.phone, variants));
        let matches = ((await this.client.persons.listPersons({ query: { phone: variants.digits } })).results ?? []).filter(owns);
        if (!matches.length && variants.alternate !== variants.digits) {
            matches = ((await this.client.persons.listPersons({ query: { phone: variants.alternate } })).results ?? []).filter(owns);
        }
        const seen = new Set<string>();
        const unique = matches.filter((candidate: any) => candidate && candidate.id && !seen.has(candidate.id) && seen.add(candidate.id));
        return unique.find((candidate: any) => (candidate.users ?? []).length) ?? unique[0];
    }

    /** Existing owner (if it is one of the advisors) wins, then the sheet code, then the fallback. */
    private resolveAdvisor(person: any | undefined, input: Record<string, unknown>, spec: DispatchSpec): DispatchAdvisor | undefined {
        const byId = new Map(Object.values(spec.advisors).map((advisor) => [advisor.id, advisor]));
        const owners = person ? (person.users ?? []).map((user: any) => user?.id ?? user) : [];
        const existing = owners.map((id: string) => byId.get(id)).find(Boolean);
        if (existing) return existing;

        const code = String(input[spec.advisorField] ?? '');
        if (spec.advisors[code]) return spec.advisors[code];
        if (spec.ownerFallbackUserId) return byId.get(spec.ownerFallbackUserId) ?? { id: spec.ownerFallbackUserId, name: '' };
        return undefined;
    }

    /** Builds a Hablla Person from the record, per the spec. */
    private async createPerson(input: Record<string, unknown>, spec: DispatchSpec, advisorId: string): Promise<any> {
        const p = spec.person;
        const name = String(input[p.nameField] ?? '') || String(input[p.phoneField] ?? '');

        const emails: Array<{ email: string }> = [];
        for (const field of p.emailFields) {
            const value = String(input[field] ?? '').trim();
            if (value && isEmail(value)) emails.push({ email: value });
        }
        for (const rule of p.derivedEmails) {
            const email = deriveEmail(input[rule.sourceField], { separator: rule.separator, domain: rule.domain });
            if (email) emails.push({ email });
        }

        const cfKeys = p.customFields === 'auto' ? customFieldKeys(input) : p.customFields;
        const customFields = cfKeys
            .filter((key) => String(input[key] ?? '').trim())
            .map((key) => ({ custom_field: key.slice(3), value: String(input[key]).trim() }));

        return this.client.persons.createPerson({
            name,
            customer_status: 'customer',
            phones: [{ phone: String(input[p.phoneField] ?? ''), is_whatsapp: true, type: 'personal' }],
            sectors: [spec.sectorId],
            users: [advisorId],
            ...(emails.length ? { emails } : {}),
            ...(customFields.length ? { custom_fields: customFields } : {}),
        });
    }

    /** Assigns the just-sent attendance to the advisor and finishes it (silent, with reason). */
    private async settleAttendance(personId: string, spec: DispatchSpec, advisorId: string | undefined): Promise<void> {
        try {
            const { results } = await this.client.services.listServices({ query: { limit: 5, connection: spec.connectionId, person: personId, status: 'in_attendance', order: 'created_at', direction_order: 'desc' } });
            const service = (results ?? [])[0];
            if (!service) return;
            if (advisorId) {
                try { await this.client.services.putTransfer(service.id, { user: advisorId, sector: spec.sectorId }); } catch (error) { }
            }
            await this.client.services.patchAction(service.id, { status: 'finished', reason: spec.finishReasonId });
        } catch (error) {
        }
    }

    private destinationKey(person: any, variants: PhoneVariants, phone: string): string {
        const matched = (person.phones ?? []).find((entry: any) => matchesPhone(entry.phone, variants));
        return (matched && matched.phone) || (person.phones ?? []).find((entry: any) => entry.is_whatsapp)?.phone || phone;
    }
}
