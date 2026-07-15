/**
 * Curated names for the handful of enums the spec CANNOT name on its own.
 *
 * A few domain enums overload a generic field (`services.type` carries the
 * message-type, the origin AND the channel; `connections.type` carries both the
 * webhook subscriptions and the channel), and one (`priority`) rides on a
 * non-descriptive field. The extractor detects these automatically (a
 * `(resource, field)` that maps to more than one value-set, see
 * {@link buildEnumRegistry}) and, absent an alias here, flags them in the report
 * instead of inventing a wrong name.
 *
 * This is the ONLY hand-authored input to enum generation, and it supplies names
 * only — never values. Keys are the stable value-set signature (the enum's sorted
 * codes joined by `|`), so a value the API adds later still flows in from the spec
 * and only a brand-new *ambiguous* enum ever needs a line here. Same curated-
 * override spirit as `SCHEMA_DOC` and `overrides/resources/`.
 */
export const ENUM_ALIASES: Record<string, string> = {
    'critical|high|low|medium': 'Priority',
    'bot|queue|user': 'ServiceOrigin',
    'audio|button|comment|contacts|document|email|file|image|interactive|location|reaction|sticker|system|text|video': 'ServiceMessageType',
    'call|chat_api|email|facebook|instagram|telegram|webchat|whatsapp': 'ServiceChannel',
    'chat_api|email|facebook|generic|gupshup|instagram|magalu|phone|phone_gti|social_media|telegram|webchat|whatsapp': 'ConnectionChannel',
};
