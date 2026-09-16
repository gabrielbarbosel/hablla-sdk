/**
 * Curated names for the handful of enums the spec CANNOT name on its own.
 *
 * A few domain enums overload a generic field (`services.type` carries the
 * message-type, the origin AND the channel; `connections.type` carries both the
 * webhook subscriptions and the channel), and one (`priority`) rides on a
 * non-descriptive field. The extractor detects these automatically (a
 * `(resource, field)` that maps to more than one value-set, see
 * `buildEnumRegistry`) and, absent an alias here, fails the run instead of
 * inventing a wrong name.
 *
 * This is the ONLY hand-authored input to enum generation, and it supplies names
 * only — never values. An alias claims the single value-set that shares one of
 * its `owners` and CONTAINS all of its `values`, so a value the API adds later
 * (e.g. `whatsapp_coex` on the connection channel) still flows in under the same
 * public name. A value the API removes, or an alias that matches zero or several
 * value-sets, is reported as an enum issue and fails the run loudly. Same
 * curated-override spirit as `SCHEMA_DOC` and `overrides/resources/`.
 */

/** One curated enum name and the signature that identifies its value-set. */
export interface EnumAlias {
    /** Public PascalCase name emitted into `gen_enums.ts`. */
    name: string;
    /** `resource.field` carriers of the enum; the matched value-set must share at least one. */
    owners: string[];
    /** Values known when the alias was curated; the matched value-set must contain every one. */
    values: string[];
}

/** The curated aliases, alphabetical by name. */
export const ENUM_ALIASES: EnumAlias[] = [
    {
        name: 'ConnectionChannel',
        owners: ['connections.type'],
        values: ['chat_api', 'email', 'facebook', 'generic', 'gupshup', 'instagram', 'magalu', 'phone', 'phone_gti', 'social_media', 'telegram', 'webchat', 'whatsapp'],
    },
    {
        name: 'Priority',
        owners: ['boards.custom_fields', 'cards.has_next_task'],
        values: ['critical', 'high', 'low', 'medium'],
    },
    {
        name: 'ServiceChannel',
        owners: ['services.type'],
        values: ['call', 'chat_api', 'email', 'facebook', 'instagram', 'telegram', 'webchat', 'whatsapp'],
    },
    {
        name: 'ServiceMessageType',
        owners: ['services.type'],
        values: ['audio', 'button', 'comment', 'contacts', 'document', 'email', 'file', 'image', 'interactive', 'location', 'reaction', 'sticker', 'system', 'text', 'video'],
    },
    {
        name: 'ServiceOrigin',
        owners: ['services.type'],
        values: ['bot', 'queue', 'user'],
    },
];
