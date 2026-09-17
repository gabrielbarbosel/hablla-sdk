/**
 * The id of a dispatch job, built and checked in one place so the app can validate an id
 * it received (`repeatOfJobId`) against the shape `createJob` produces.
 */

/** The shape {@link jobIdOf} builds: the audience fingerprint plus the creation time in base 36. */
const JOB_ID_PATTERN = /^[0-9a-f]{16}-\d+-[0-9a-z]+$/;

/** The id of the job of an audience created at `createdAt`. */
export function jobIdOf(fingerprint: string, createdAt: number): string {
    return `${fingerprint}-${createdAt.toString(36)}`;
}

/** True for a value shaped like a job id. */
export function isJobId(value: string): boolean {
    return JOB_ID_PATTERN.test(value);
}
