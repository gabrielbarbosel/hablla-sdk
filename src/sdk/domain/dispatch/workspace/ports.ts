import type { ContactPage, DispatchContact, DispatchJob, DispatchJobPhase } from './types';

/**
 * Durable job state with optimistic concurrency. Contacts are addressed by index so a
 * chunk reads and writes only its own slice. `withExclusiveAccess` must be mutually
 * exclusive across concurrent executions (GAS: script lock); `update` performs its
 * compare-and-set under the same exclusion.
 */
export interface DispatchJobStore {
    withExclusiveAccess<T>(action: () => Promise<T>): Promise<T>;
    /** Persists a new job at revision 0. */
    insert(job: DispatchJob, contacts: readonly DispatchContact[]): Promise<DispatchJob>;
    /** Throws `JobNotFoundError`. */
    load(jobId: string): Promise<DispatchJob>;
    findByFingerprint(fingerprint: string): Promise<DispatchJob[]>;
    findByPhases(phases: readonly DispatchJobPhase[]): Promise<DispatchJob[]>;
    loadContacts(jobId: string, page: ContactPage): Promise<DispatchContact[]>;
    /** Person id → index of the contact that holds it (see `holdsPersonClaim`). */
    loadPersonClaims(jobId: string): Promise<ReadonlyMap<string, number>>;
    /**
     * Persists the header and the given contacts (by index) atomically when the stored
     * revision equals `job.revision`; returns the header at the incremented revision.
     * Throws `StaleJobError` otherwise.
     */
    update(job: DispatchJob, changedContacts: readonly DispatchContact[]): Promise<DispatchJob>;
}

/** Time source and wait, injected so the core never touches timers. */
export interface Clock {
    now(): number;
    sleep(ms: number): Promise<void>;
}
