/**
 * Named limits and delays of the workspace dispatch, in one module so the pure planners
 * (lookup, writes, reconciliation) and the job machine read the same values without
 * depending on each other.
 */

/** Contacts per block in `resolving` (at most ~200 GETs per block). */
export const LOOKUP_CHUNK_SIZE = 50;

/** Contacts per block in `materializing` (at most ~350 calls per block: send-time lookup plus writes). */
export const WRITE_CHUNK_SIZE = 50;

/** Attempts per read or write before the contact fails. */
export const MAX_CALL_ATTEMPTS = 3;

/** `createPerson` sends per contact: the create is re-sent only once after a reconciliation found nothing. */
export const MAX_CREATE_SENDS = 2;

/** A 5xx or a transport failure is retried in a later execution, never in the same round. */
export const CALL_RETRY_DELAY_MS = 60_000;

/** Minimum delay before reconciling a non-idempotent write whose outcome is unknown. */
export const RECONCILIATION_DELAY_MS = 60_000;

/** The gateway's 429 says "wait one minute" and carries no Retry-After. */
export const THROTTLE_COOLDOWN_MS = 60_000;

/** A network outage should not burn attempts on immediate rounds. */
export const TRANSPORT_COOLDOWN_MS = 60_000;

/**
 * Consecutive rounds that may come back interrupted before the interruptions are read as
 * transport failures. An interrupted wave consumes no attempt, so a call that always
 * breaks its wave (in Apps Script `fetchAll` throws for the whole wave) would otherwise
 * be retried every cooldown forever. Past this many rounds the contacts spend attempts and
 * end in `lookupFailed` or `writeFailed`, which also means an outage longer than these
 * rounds plus `MAX_CALL_ATTEMPTS` cooldowns fails those contacts instead of waiting.
 */
export const INTERRUPTED_ROUNDS_BEFORE_ATTEMPT = 5;

/** Interval between audience counts (probes 03 and 04). */
export const AUDIENCE_POLL_INTERVAL_MS = 5_000;

/** The count answers 500 for ~20-30 s after the segmentation is created; slack for large audiences. */
export const AUDIENCE_READY_TIMEOUT_MS = 180_000;

/** No block, and no round inside a block, starts without this much time left before `deadlineAt`. */
export const CHUNK_TIME_RESERVE_MS = 60_000;

/** Attendance statuses that mean the contact is in a live conversation (probe 00). */
export const OPEN_ATTENDANCE_STATUSES: readonly string[] = ['pending', 'in_queue', 'in_attendance', 'in_bot'];

/** Page size of a person lookup by phone. */
export const PERSON_LOOKUP_LIMIT = 50;

/** Page size of an attendance lookup; items are classified by their own status, not by the filter. */
export const ATTENDANCE_LOOKUP_LIMIT = 50;

/** Page size of the user roster and of the custom-field catalog. */
export const CATALOG_PAGE_LIMIT = 50;

/** Page size of the campaign lookup by name. */
export const CAMPAIGN_RECONCILE_PAGE_LIMIT = 50;

/** Page size of the segmentation-item lookup by person. */
export const SEGMENTATION_ITEM_LOOKUP_LIMIT = 50;

/** Longest failure detail kept on a contact or a job. */
export const FAILURE_DETAIL_MAX_LENGTH = 300;
