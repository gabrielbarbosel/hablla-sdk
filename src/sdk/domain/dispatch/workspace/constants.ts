/**
 * Protocol facts of the workspace dispatch: values Hablla or the dispatch model fix, which
 * no configuration may change. Every tunable policy lives in `DISPATCH_TUNING_SPEC`.
 */

/** Attendance statuses that mean the contact is in a live conversation (probe 00). */
export const OPEN_ATTENDANCE_STATUSES: readonly string[] = ['pending', 'in_queue', 'in_attendance', 'in_bot'];

/** First page of the exclusion listing; the report routes are 1-based. */
export const FIRST_EXCLUSION_PAGE = 1;

/** The one Bearer call `start` spends creating the job's segmentation. */
export const CREATE_SEGMENTATION_CALLS = 1;

/**
 * Calls of the largest single contact step: a lookup stage or a reconciliation, one call
 * per shape of the contact's phone, of which there are at most two.
 */
export const LARGEST_STEP_CALLS = 2;
