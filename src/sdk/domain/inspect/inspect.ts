import type { EntityType, MemberView, ResolvedEntity } from './types';

/**
 * Pure, runtime-agnostic entity resolution for the inspector (runs in Node + GAS +
 * isolate). Owns the single source of truth for: the type→endpoint map, the entity
 * sanitizer, the display-name rule and workspace-member flattening/matching.
 *
 * No client, no I/O: the consumer performs the actual fetch (GAS `bulkGet_`, the members
 * list) and feeds the raw API objects into {@link project}. Every method is synchronous.
 *
 * Endpoints carry a `{ws}` placeholder that the consumer substitutes with the workspace
 * id before fetching — the same convention already used across the Apps Script bridge.
 */
export class EntityInspector {
    /**
     * The type→path map (single source of truth). Carries the exact populate expansions
     * used by the inspector today. Returns '' for `user` (no GET by id — resolved from the
     * workspace members list) and for unknown types.
     */
    endpoint(type: EntityType, id: string): string {
        const map: Record<string, string> = {
            person: '/v1/workspaces/{ws}/persons/' + id + '?populate=true',
            connection: '/v1/workspaces/{ws}/connections/' + id + '?populate=credential,sector',
            flow: '/v1/workspaces/{ws}/flows/' + id,
            sector: '/v1/workspaces/{ws}/sectors/' + id + '?populate=true',
            campaign: '/v1/workspaces/{ws}/campaigns/' + id + '?populate=true',
            tag: '/v1/workspaces/{ws}/tags/' + id,
            template: '/v1/workspaces/{ws}/templates/' + id,
            credential: '/v1/workspaces/{ws}/credentials/' + id,
            reason: '/v1/workspaces/{ws}/reasons/' + id,
        };
        return map[type] || '';
    }

    /**
     * Recursive sanitizer for an API object destined for the inspector: strips noise/empties,
     * caps depth and array size, and MASKS secrets (never leaks token/password/secret).
     * Pure JS (Object.keys/Array.isArray) — no Buffer/TextEncoder.
     */
    clean(value: unknown, depth = 0): unknown {
        if (value == null || value === '') return null;
        if (Array.isArray(value)) {
            if (depth >= 3) return '[' + value.length + ' itens]';
            const arr = value.slice(0, 40)
                .map((v) => this.clean(v, depth + 1))
                .filter((v) => v != null && v !== '');
            return arr.length ? arr : null;
        }
        if (typeof value === 'function') return null;
        if (typeof value === 'object') {
            if (depth >= 3) return '{…}';
            const source = value as Record<string, unknown>;
            const out: Record<string, unknown> = {};
            Object.keys(source).forEach((k) => {
                if (/^[_$]/.test(k) || k === '__v' || /workspace/i.test(k)) return;
                if (/pass(word)?|secret|token|refresh_token|api_?key|access_?token/i.test(k)) {
                    if (source[k]) out[k] = '••••••';
                    return;
                }
                const cleaned = this.clean(source[k], depth + 1);
                const emptyObj = cleaned != null
                    && typeof cleaned === 'object'
                    && !Array.isArray(cleaned)
                    && !Object.keys(cleaned as Record<string, unknown>).length;
                if (cleaned != null && cleaned !== '' && !emptyObj) out[k] = cleaned;
            });
            return out;
        }
        return value;
    }

    /** Display-name rule: name > title > phone > id. */
    displayName(raw: any, id: string): string {
        return raw?.name || raw?.title || raw?.phone || id;
    }

    /**
     * Builds the resolved result for one entity. Serves both the single and the batch
     * paths, and the user path (feeding the flattened {@link MemberView} as `raw`).
     * Truthy `raw` → cleaned object; null `raw` → `error: true`.
     */
    project(type: string, id: string, raw: any): ResolvedEntity {
        if (raw) {
            return {
                type,
                id,
                name: this.displayName(raw, id),
                obj: (this.clean(raw, 0) as Record<string, unknown>) || {},
            };
        }
        return { type, id, name: id, obj: {}, error: true };
    }

    /**
     * Flattens a workspace member into the inspector-friendly {@link MemberView}. The
     * nested `user` object may be absent (defaults to `{}`).
     */
    flattenMember(member: any): MemberView {
        const user = member.user || {};
        return {
            name: user.name || '',
            email: user.email || '',
            papel: member.role_type || '',
            disponivel: member.is_available,
            online: member.is_online,
            emails_de_atendimento: member.service_emails,
            criado_em: user.created_at,
        };
    }

    /**
     * Finds the workspace member matching `id`, by nested `user.id`, by raw `user` (when it
     * is the id itself) or by the member's own `id`. Returns undefined when not a member.
     */
    findMember(members: any[], id: string): any | undefined {
        return (members || []).find((wu) => {
            const user = wu.user || {};
            return (user.id || user) === id || wu.id === id;
        });
    }

    /**
     * Path of the workspace members list page (last bit of API knowledge). OPTIONAL: the
     * consumer may adopt it in its `pathFor`/`listAll_`.
     */
    membersPath(page = 1): string {
        return '/v1/workspaces/{ws}/users?populate=true&limit=50&page=' + page;
    }
}
