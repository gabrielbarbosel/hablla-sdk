/**
 * Generator pipeline: EXTRACT phase orchestrator.
 *
 * Flow: fetch (live swagger) + load (studio bundle spec) -> merge -> overrides
 * -> resolved spec. This is the front half of the codegen; the emit stage
 * (gen_*.ts) consumes the spec this produces.
 *
 * Run directly to write `src/generator/openapi.json`:
 *   tsc && node dist/generator/pipeline.js
 */

import * as fs from 'fs';
import * as path from 'path';

import {
    HTTP_METHODS,
    OpenApiSpec,
    applyEntityResponses,
    buildStudioSpec,
    countOperations,
    ensureSdkMethods,
    extractBundleFunctions,
    fetchStudioBundle,
    fetchSwaggerDoc,
    loadEntitySchemas,
    mergeSpecs,
} from './extract';
import { applyOverrides, isMultipartOperation, OverrideResult } from './overrides';
import { emitAll } from './stages/emit';
import { evaluateGuards } from './stages/guard';
import { classify, countEndpoints, diffResources, endpointDropPct } from './stages/diff';
import { promoteResources, PromoteResult } from './stages/promote';
import { buildReport, writeReport } from './stages/report';

/**
 * Repo root, resolved from this module's location. Works whether running from
 * `dist/generator/` (compiled) or `src/generator/` (via a TS runner): both sit
 * two levels below the repo root.
 */
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Default source of the bundle ENTITY component schemas (data shapes only). The
 * live swagger carries no schemas, so the SDK's typed interfaces / `Paged<T>`
 * returns come from these bundle-derived entities. Routes, method names and
 * multipart flags are NOT read from here — they come from the live AST walk.
 */
// Self-contained: the entity schemas live in the committed spec itself. They are
// read at the start of a run (to type the fresh generation) and re-emitted into the
// new spec at the end, so they persist run-to-run WITHOUT any file outside the repo.
// (Previously pointed at ../hablla-rpo-legacy, which broke in CI — that path only
// exists on the dev box, so CI produced Promise<unknown> everywhere -> false breaking.)
export const DEFAULT_ENTITY_SCHEMAS = path.resolve(REPO_ROOT, 'src', 'generator', 'openapi.json');

/** Default output path for the resolved spec. */
export const DEFAULT_OUTPUT = path.resolve(REPO_ROOT, 'src', 'generator', 'openapi.json');

/** Staging directory the emit stage writes candidate resources into. */
export const DEFAULT_STAGING_DIR = path.resolve(REPO_ROOT, 'src', 'generator', '_staging');

/** Live SDK resources directory — promotion's target. */
export const DEFAULT_RESOURCES_DIR = path.resolve(REPO_ROOT, 'src', 'sdk', 'resources');

/** Destination for the machine-readable run report. */
export const DEFAULT_REPORT_PATH = path.resolve(REPO_ROOT, 'generation-report.json');

/** Options for {@link runExtractPipeline}. */
export interface ExtractPipelineOptions {
    /** Path to a spec whose `components.schemas` supply the bundle entity types. */
    entitySchemasPath?: string;
    /** When false, skip the live swagger fetch entirely (bundle spec only). */
    fetchLiveSwagger?: boolean;
    /**
     * Pre-fetched bundle source, to avoid re-downloading ~21MB in tests. When
     * omitted the pipeline fetches {@link fetchStudioBundle} live.
     */
    bundleCode?: string;
    /** Sink for progress logs; defaults to `console.log`. Pass `() => {}` to silence. */
    log?: (message: string) => void;
}

/** Outcome of the extract pipeline. */
export interface ExtractPipelineResult {
    spec: OpenApiSpec;
    swaggerSource: 'live' | 'skipped' | 'unavailable';
    overrides: OverrideResult;
    operationCount: number;
    pathCount: number;
    /** How many operations the live AST walk contributed (bundle-sourced). */
    bundleOperationCount: number;
    /** How many operations declare a multipart/form-data body. */
    multipartCount: number;
    /** How many request functions the bundle AST walk recovered. */
    bundleFunctionCount: number;
    /** Whether the AST walk recovered any request functions (a proxy for parse health). */
    parseOk: boolean;
    /** Whether the `APIClient` class was present in the bundle source. */
    apiClientFound: boolean;
    /** How many resolved routes carry `{workspace_id}` (the resolved `{workspace}` alias). */
    workspaceAliasCount: number;
}

/** Count resolved routes that carry the `{workspace_id}` path segment. */
function countWorkspaceRoutes(spec: OpenApiSpec): number {
    let n = 0;
    for (const pathStr of Object.keys(spec.paths)) {
        if (pathStr.includes('{workspace_id}')) n++;
    }
    return n;
}

/** Count operations whose request body is multipart/form-data. */
function countMultipart(spec: OpenApiSpec): number {
    let n = 0;
    for (const item of Object.values(spec.paths)) {
        for (const method of HTTP_METHODS) {
            const op = item[method];
            if (op && isMultipartOperation(op)) n++;
        }
    }
    return n;
}

/**
 * Run the extract phase and return the resolved (merged + overridden) spec
 * without writing to disk.
 *
 * Flow: fetch the live studio bundle -> AST-walk it into the authoritative
 * bundle spec -> merge the live swagger to enrich (best-effort) -> apply
 * overrides -> guarantee every op has an `x-sdk-method`.
 *
 * The live swagger is best-effort: if it is unreachable, the pipeline logs the
 * failure and proceeds with the bundle spec alone (which already carries every
 * authoritative operation, including the multipart uploads).
 * @param options See {@link ExtractPipelineOptions}.
 */
export async function runExtractPipeline(
    options: ExtractPipelineOptions = {},
): Promise<ExtractPipelineResult> {
    const log = options.log ?? ((m: string) => console.log(m));
    const entitySchemasPath = options.entitySchemasPath ?? DEFAULT_ENTITY_SCHEMAS;
    const fetchLive = options.fetchLiveSwagger ?? true;

    let bundleCode = options.bundleCode;
    if (!bundleCode) {
        log('[extract] fetching live studio bundle...');
        const bundle = await fetchStudioBundle();
        log(`[extract] bundle: ${bundle.url} (${(bundle.code.length / 1e6).toFixed(1)}MB)`);
        bundleCode = bundle.code;
    }

    log('[extract] AST-walking bundle for request functions...');
    const apiClientFound = /\bAPIClient\b/.test(bundleCode);
    const functions = extractBundleFunctions(bundleCode);
    const multipartFns = functions.filter((f) => f.multipart).length;
    log(`[extract] recovered ${functions.length} request functions (${multipartFns} *WithFile uploads)`);

    log(`[extract] loading bundle entity schemas: ${entitySchemasPath}`);
    const entitySchemas = loadEntitySchemas(entitySchemasPath);
    log(`[extract] entity schemas: ${Object.keys(entitySchemas).length}`);

    const studioSpec = buildStudioSpec(functions, { entitySchemas });
    const bundleOperationCount = countOperations(studioSpec);
    log(`[extract] bundle spec: ${Object.keys(studioSpec.paths).length} paths, ${bundleOperationCount} operations`);

    let spec: OpenApiSpec = studioSpec;
    let swaggerSource: ExtractPipelineResult['swaggerSource'] = 'skipped';
    if (fetchLive) {
        try {
            log('[extract] fetching live swagger...');
            const swaggerDoc = await fetchSwaggerDoc();
            log(`[extract] live swagger: ${Object.keys(swaggerDoc.paths || {}).length} paths`);
            spec = mergeSpecs(studioSpec, swaggerDoc);
            swaggerSource = 'live';
            log(`[extract] merged: ${Object.keys(spec.paths).length} paths, ${countOperations(spec)} operations`);
        } catch (error) {
            swaggerSource = 'unavailable';
            log(`[extract] live swagger unavailable (${(error as Error).message}); continuing with bundle spec only`);
        }
    }

    const typedResponses = applyEntityResponses(spec);
    log(`[extract] entity responses: derived typed success for ${typedResponses} schema-less operation(s)`);

    const overrides = applyOverrides(spec);
    log(`[extract] overrides applied: ${overrides.applied.length ? overrides.applied.join(', ') : 'none'}`);
    if (overrides.missing.length) {
        log(`[extract] WARNING: overrides with no matching operation: ${overrides.missing.join(', ')}`);
    }

    const filled = ensureSdkMethods(spec);
    log(`[extract] x-sdk-method: filled ${filled} swagger-only operation(s); all operations annotated`);

    return {
        spec,
        swaggerSource,
        overrides,
        operationCount: countOperations(spec),
        pathCount: Object.keys(spec.paths).length,
        bundleOperationCount,
        multipartCount: countMultipart(spec),
        bundleFunctionCount: functions.length,
        parseOk: functions.length > 0,
        apiClientFound,
        workspaceAliasCount: countWorkspaceRoutes(spec),
    };
}

/**
 * Run the extract phase and write the resolved spec to disk.
 * @param outputPath Destination for the resolved openapi.json.
 * @param options See {@link ExtractPipelineOptions}.
 */
export async function writeResolvedSpec(
    outputPath: string = DEFAULT_OUTPUT,
    options: ExtractPipelineOptions = {},
): Promise<ExtractPipelineResult> {
    const result = await runExtractPipeline(options);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result.spec, null, 2));
    (options.log ?? ((m: string) => console.log(m)))(`[extract] wrote ${outputPath}`);
    return result;
}

/**
 * Assert that the campaigns/sheet operation ended up as multipart/form-data.
 * A cheap smoke test that the override layer did its job.
 * @param spec The resolved spec.
 */
export function assertSheetIsMultipart(spec: OpenApiSpec): void {
    const sheet = spec.paths['/v2/workspaces/{workspace_id}/campaigns/sheet']?.post;
    if (!isMultipartOperation(sheet)) {
        throw new Error('campaigns/sheet POST is not multipart/form-data after overrides');
    }
}

/** Options for {@link runCodegenPipeline}. */
export interface CodegenPipelineOptions extends ExtractPipelineOptions {
    /** Where to write the resolved spec (defaults to {@link DEFAULT_OUTPUT}). */
    outputPath?: string;
    /** Where the emit stage stages candidate resources (defaults to {@link DEFAULT_STAGING_DIR}). */
    stagingDir?: string;
    /** The live resources tree to diff/promote against (defaults to {@link DEFAULT_RESOURCES_DIR}). */
    resourcesDir?: string;
    /** Where to write the run report (defaults to {@link DEFAULT_REPORT_PATH}). */
    reportPath?: string;
    /** When false, compute + report but never write to the resources tree. */
    promote?: boolean;
}

/** Remove every `gen_*.ts` in a staging dir so it reflects exactly this run. */
function cleanStaging(stagingDir: string): void {
    if (!fs.existsSync(stagingDir)) return;
    for (const file of fs.readdirSync(stagingDir)) {
        if (file.startsWith('gen_') && file.endsWith('.ts')) fs.rmSync(path.join(stagingDir, file));
    }
}

/**
 * Run the WHOLE codegen loop autonomously: fetch -> extract -> merge -> emit ->
 * guard -> diff -> classify -> promote -> report.
 *
 * The single side-effecting contract for downstream automation is the report
 * written to `reportPath`. Promotion writes to the resources tree only when the
 * run is safe (any classification except `failure`) and `promote !== false`.
 * @param options See {@link CodegenPipelineOptions}.
 * @returns The generation report (also written to disk).
 */
export async function runCodegenPipeline(options: CodegenPipelineOptions = {}) {
    const log = options.log ?? ((m: string) => console.log(m));
    const stagingDir = options.stagingDir ?? DEFAULT_STAGING_DIR;
    const resourcesDir = options.resourcesDir ?? DEFAULT_RESOURCES_DIR;
    const reportPath = options.reportPath ?? DEFAULT_REPORT_PATH;
    const outputPath = options.outputPath ?? DEFAULT_OUTPUT;

    // 1. FETCH -> EXTRACT -> MERGE, and persist the resolved spec.
    const extract = await writeResolvedSpec(outputPath, options);

    // 2. EMIT -> _staging (clean first so dropped resources leave no stale file).
    log('[emit] emitting candidate resources to staging...');
    cleanStaging(stagingDir);
    const emit = emitAll(extract.spec, stagingDir);
    log(`[emit] ${emit.files} groups, ${emit.methods} generated methods, ${emit.overridden} curated verbatim`);

    // 3. GUARDS / CANARY (A11): abort promotion on an anomalous extraction.
    const guards = evaluateGuards({
        parseOk: extract.parseOk,
        operationCount: extract.operationCount,
        multipartCount: extract.multipartCount,
        apiClientFound: extract.apiClientFound,
        workspaceAliasCount: extract.workspaceAliasCount,
    });
    if (guards.ok) {
        log('[guard] all invariants held');
    } else {
        log(`[guard] ANOMALY -> ${guards.reasons.join('; ')}`);
    }

    // 4. DIFF _staging vs the live resources tree.
    const diff = diffResources(stagingDir, resourcesDir);
    const dropPct = endpointDropPct(diff, countEndpoints(resourcesDir));
    log(`[diff] +${diff.addedEndpoints.length} -${diff.removedEndpoints.length} ~${diff.changedSignatures.length} endpoints; files +${diff.addedFiles.length} ~${diff.changedFiles.length}`);

    // 5. CLASSIFY.
    const classification = classify(guards, diff);
    log(`[classify] ${classification}`);

    // 6. PROMOTE — unless a guard tripped (keep the current resources intact).
    let promotion: PromoteResult | null = null;
    if (classification === 'failure') {
        log('[promote] SKIPPED (failure) — current resources kept intact');
    } else if (options.promote === false) {
        log('[promote] SKIPPED (promote disabled)');
    } else {
        promotion = promoteResources(stagingDir, resourcesDir);
        log(`[promote] copied ${promotion.copied.length}, removed ${promotion.removed.length}`);
    }

    // 7. REPORT.
    const report = buildReport({
        classification,
        guards,
        endpointDropPct: dropPct,
        spec: {
            generatedAt: new Date().toISOString(),
            swaggerSource: extract.swaggerSource,
            operations: extract.operationCount,
            paths: extract.pathCount,
            bundleOperations: extract.bundleOperationCount,
            multipart: extract.multipartCount,
            bundleFunctions: extract.bundleFunctionCount,
            apiClientFound: extract.apiClientFound,
            workspaceAlias: extract.workspaceAliasCount,
        },
        diff,
        promotion,
    });
    writeReport(reportPath, report);
    log(`[report] wrote ${reportPath}`);
    return report;
}

/**
 * Write a `failure` report when the pipeline could not even reach the guard
 * stage (a hard fetch/parse error). Keeps the report contract intact for the
 * downstream release driver so cron never silently produces nothing.
 * @param reportPath Destination report path.
 * @param error The thrown error.
 */
function writeFailureReport(reportPath: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    writeReport(reportPath, {
        classification: 'failure',
        guards: {
            parseOk: false,
            uploads: 0,
            endpointDropPct: 0,
            anomaly: true,
            reasons: [`pipeline threw before classification: ${message}`],
        },
        spec: {
            generatedAt: new Date().toISOString(),
            swaggerSource: 'unavailable',
            operations: 0,
            paths: 0,
            bundleOperations: 0,
            multipart: 0,
            bundleFunctions: 0,
            apiClientFound: false,
            workspaceAlias: 0,
        },
        diff: {
            addedEndpoints: [],
            removedEndpoints: [],
            changedSignatures: [],
            addedFiles: [],
            changedFiles: [],
        },
        promotion: null,
    });
}

/** CLI entry: run the whole codegen loop and print a summary. */
async function main(): Promise<void> {
    const report = await runCodegenPipeline();
    assertSheetIsMultipart(
        JSON.parse(fs.readFileSync(DEFAULT_OUTPUT, 'utf8')) as OpenApiSpec,
    );
    console.log('[pipeline] DONE');
    console.log(`  classification : ${report.classification}`);
    console.log(`  swagger source : ${report.spec.swaggerSource}`);
    console.log(`  operations     : ${report.spec.operations} (bundle: ${report.spec.bundleOperations})`);
    console.log(`  multipart ops  : ${report.spec.multipart}`);
    console.log(`  guards         : ${report.guards.anomaly ? `ANOMALY (${report.guards.reasons.join('; ')})` : 'OK'}`);
    console.log(`  endpoints      : +${report.diff.addedEndpoints.length} / -${report.diff.removedEndpoints.length} / ~${report.diff.changedSignatures.length}`);
    console.log(`  files          : +${report.diff.addedFiles.length} / ~${report.diff.changedFiles.length}`);
    console.log(`  promotion      : ${report.promotion ? `${report.promotion.copied.length} copied, ${report.promotion.removed.length} removed` : 'skipped'}`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error('[pipeline] FAILED:', error);
        try {
            writeFailureReport(DEFAULT_REPORT_PATH, error);
            console.error(`[pipeline] wrote failure report to ${DEFAULT_REPORT_PATH}`);
        } catch (reportError) {
            console.error('[pipeline] could not write failure report:', reportError);
        }
        process.exit(1);
    });
}
