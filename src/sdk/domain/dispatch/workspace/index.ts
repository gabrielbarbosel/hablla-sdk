/**
 * Flow-less dispatch through the workspace token: the {@link WorkspaceDispatch}
 * orchestrator, its public types, ports and errors.
 */

export { WorkspaceDispatch } from './workspace-dispatch';
export type { WorkspaceDispatchPorts } from './workspace-dispatch';
export { RESUMABLE_PHASES } from './job-machine';
export type { Clock, DispatchJobStore } from './ports';
export {
    CallBudgetExceededError,
    DispatchThrottledError,
    DispatchTransportError,
    DispatchValidationError,
    DuplicateDispatchError,
    InvalidJobTransitionError,
    JobBusyError,
    JobNotFoundError,
    StaleJobError,
    UnexpectedPayloadError,
} from './errors';
export type {
    AdvisorKeyKind,
    AdvisorResolution,
    CampaignCreateBody,
    ChunkedPhase,
    ContactFailure,
    ContactOutcome,
    ContactPage,
    ContinueOptions,
    DispatchContact,
    DispatchJob,
    DispatchJobPhase,
    DispatchJobView,
    DispatchNextStep,
    DispatchPacing,
    DispatchProgress,
    DispatchSettings,
    ExclusionCriteria,
    ExclusionSummary,
    HabllaDispatchConfig,
    JobFailure,
    JobFailureReason,
    JobWarning,
    LookupPurpose,
    OperatorOptions,
    OwnerChange,
    OwnerSource,
    PendingWrite,
    ResolvedPerson,
    ResumePhase,
    SegmentationCreateBody,
    SegmentationFilter,
    SystemOwnerPolicy,
    TargetOwner,
    UnresolvedAdvisorPolicy,
    WorkspaceDispatchLimits,
    WorkspaceDispatchRequest,
    WorkspaceDispatchRow,
} from './types';
