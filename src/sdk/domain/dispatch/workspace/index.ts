/**
 * Flow-less dispatch through the workspace token: the {@link WorkspaceDispatch}
 * orchestrator, its public types, ports and errors.
 */

export { WorkspaceDispatch } from './workspace-dispatch';
export type { WorkspaceDispatchPorts } from './workspace-dispatch';
export { CLAIMING_OUTCOMES, holdsPersonClaim } from './person-claims';
export { DEFAULT_MAX_EXCLUSION_PAGES, GOOGLE_WORKSPACE_DAILY_CALL_QUOTA, resolveDispatchLimits } from './limits';
export type { DispatchLimits } from './limits';
export { EXCLUSION_PAGE_LIMIT } from './constants';
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
export { CONTACT_OUTCOMES, RESUMABLE_PHASES } from './types';
export type {
    AdvisorKeyKind,
    AdvisorResolution,
    CampaignCreateBody,
    ChunkedPhase,
    ContactFailure,
    ContactOutcome,
    ContactPage,
    CustomFieldValue,
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
    PersonCreateBody,
    PersonPhoneBody,
    PersonUpdateBody,
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
