import type { HabllaClient } from '../client';
import { Dispatch } from './dispatch/dispatch';
import { MassDispatch } from './dispatch/mass-dispatch';
import { FlowDispatch } from './dispatch/flow-dispatch';
import { EntityInspector } from './inspect/inspect';

/**
 * Composition of the domain orchestrators over a **pure** {@link HabllaClient}.
 *
 * The client stays raw Hablla (auth + http + generated resources, 1:1 with the API);
 * every complex, multi-call workflow — dispatch policies, flow-less mass dispatch,
 * attendance settle/sweep, entity inspection — lives here. Client-backed orchestrators
 * are injected with the client; the pure {@link EntityInspector} takes none. This is the
 * layer that holds our business logic, kept strictly outside the client.
 *
 * ```ts
 * const hablla = new HabllaClient(config);
 * const domain = new HabllaDomain(hablla);
 * await domain.massDispatch.dispatchPersonalized(contacts, spec);
 * ```
 *
 * In the RPO runtime this is published as `globalThis.habllaDomain` by the
 * `W_HabllaDomain` class, which reads the pure client from `globalThis.hablla` — the
 * same global-handoff pattern `W_Utils` uses for the shared utils.
 */
export class HabllaDomain {
    /** Per-contact dispatch executor (Person/Service objects + our policies). */
    readonly dispatch: Dispatch;
    /**
     * Flow-less mass dispatch (import audience + single WhatsApp campaign). Ledger-less
     * by default; construct {@link MassDispatch} directly with a {@link DispatchLedger}
     * to record dispatches to a durable sink.
     */
    readonly massDispatch: MassDispatch;
    /**
     * Disparo por FLUXO legado (audiência via campaigns/sheet + fluxo). Preserva o
     * workaround Bearer-explícito do bug 500-circular.
     */
    readonly flowDispatch: FlowDispatch;
    /**
     * Pure entity resolution for the inspector (type→endpoint map, sanitizer, display-name
     * rule, member flattening/matching). Client-less — the consumer performs the fetch.
     */
    readonly inspect: EntityInspector;

    constructor(client: HabllaClient) {
        this.dispatch = new Dispatch(client);
        this.massDispatch = new MassDispatch(client);
        this.flowDispatch = new FlowDispatch(client);
        this.inspect = new EntityInspector();
    }
}

export { Dispatch } from './dispatch/dispatch';
export { MassDispatch } from './dispatch/mass-dispatch';
export { FlowDispatch } from './dispatch/flow-dispatch';
export { EntityInspector } from './inspect/inspect';
export { buildXlsx } from './dispatch/xlsx';
export type { EntityType, EntityRef, ResolvedEntity, MemberView } from './inspect/types';
export type {
    DispatchSpec,
    DispatchPersonSpec,
    DispatchAdvisor,
    DerivedEmailRule,
    DispatchStatus,
    DispatchResult,
    MassDispatchContact,
    MassDispatchSpec,
    AttendanceGuard,
    AttendanceGuardReport,
    MassDispatchLedgerEntry,
    MassDispatchResult,
    DispatchLedger,
    FlowDispatchContact,
    FlowDispatchConfig,
    FlowDispatchResult,
} from './dispatch/types';
