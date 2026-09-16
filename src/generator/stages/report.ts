/**
 * Generator stage: REPORT.
 *
 * Serializes the outcome of one codegen run into `generation-report.json`, the
 * hand-off contract consumed by `scripts/codegen-summary.mjs` (the outcome the
 * workflow routes on, the CHANGELOG/PR/issue text) and `scripts/release.mjs`
 * (which picks the semver bump from `classification`).
 *
 * The report is a pure serialization of already-computed values — no side
 * effects beyond the single `writeFileSync` — so the whole pipeline is
 * replayable and its output diffable.
 */

import * as fs from 'fs';

import { Classification, ResourceDiff } from './diff';
import { GuardResult } from './guard';
import { PromoteResult } from './promote';

/** The `guards` block of the report (mirrors `scripts/release.mjs`). */
export interface ReportGuards {
    parseOk: boolean;
    uploads: number;
    endpointDropPct: number;
    anomaly: boolean;
    reasons: string[];
}

/** The `spec` block: provenance + shape metrics for the resolved spec. */
export interface ReportSpec {
    /** ISO timestamp the run finished. */
    generatedAt: string;
    /** Where the live swagger came from: `live` | `skipped` | `unavailable`. */
    swaggerSource: string;
    /** Total operations in the resolved spec. */
    operations: number;
    /** Total paths in the resolved spec. */
    paths: number;
    /** Operations contributed by the bundle AST walk. */
    bundleOperations: number;
    /** Multipart/form-data upload operations. */
    multipart: number;
    /** Request functions recovered from the bundle. */
    bundleFunctions: number;
    /** Whether the `APIClient` class was found in the bundle. */
    apiClientFound: boolean;
    /** Routes that resolved the `{workspace}` alias. */
    workspaceAlias: number;
}

/** The full report written to `generation-report.json`. */
export interface GenerationReport {
    classification: Classification;
    guards: ReportGuards;
    spec: ReportSpec;
    diff: ResourceDiff;
    /** What promotion did to the live tree (`null` when promotion was skipped). */
    promotion: PromoteResult | null;
}

/** Inputs to {@link buildReport}, gathered by the pipeline. */
export interface BuildReportInput {
    classification: Classification;
    guards: GuardResult;
    endpointDropPct: number;
    spec: ReportSpec;
    diff: ResourceDiff;
    promotion: PromoteResult | null;
}

/** Assemble the report object from the pipeline's computed values. */
export function buildReport(input: BuildReportInput): GenerationReport {
    return {
        classification: input.classification,
        guards: {
            parseOk: input.guards.parseOk,
            uploads: input.guards.uploads,
            endpointDropPct: input.endpointDropPct,
            anomaly: input.guards.anomaly,
            reasons: input.guards.reasons,
        },
        spec: input.spec,
        diff: input.diff,
        promotion: input.promotion,
    };
}

/**
 * Write the report to disk as pretty JSON with a trailing newline.
 * @param reportPath Absolute destination path.
 * @param report The report to serialize.
 */
export function writeReport(reportPath: string, report: GenerationReport): void {
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}
