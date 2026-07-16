/**
 * Types for the entity inspector. The inspector is a **pure** domain module: it owns
 * the API type→endpoint map, the entity sanitizer, the display-name rule and the
 * workspace-member resolution, with zero client/I-O dependency.
 */

/** Entity kinds the inspector knows how to resolve and render. */
export type EntityType =
    | 'person'
    | 'connection'
    | 'user'
    | 'flow'
    | 'sector'
    | 'campaign'
    | 'tag'
    | 'template'
    | 'credential'
    | 'reason';

/** A reference to a single entity to resolve. */
export interface EntityRef {
    type: EntityType;
    id: string;
}

/**
 * The inspector's output shape for one entity. `obj` is the cleaned API object; `error`
 * is set when the entity could not be resolved.
 */
export interface ResolvedEntity {
    type: string;
    id: string;
    name: string;
    obj: Record<string, unknown>;
    error?: boolean;
}

/**
 * Flattened, inspector-friendly view of a workspace member. The PT-BR keys are kept on
 * purpose: the inspector renders keys as UI labels, the same precedent set by the PT-BR
 * status strings of `DispatchResult`.
 */
export interface MemberView {
    name: string;
    email: string;
    papel: string;
    disponivel?: boolean;
    online?: boolean;
    emails_de_atendimento?: unknown;
    criado_em?: unknown;
}
