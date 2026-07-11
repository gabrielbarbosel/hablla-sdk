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
export const DEFAULT_ENTITY_SCHEMAS = path.resolve(
    REPO_ROOT,
    '..',
    'hablla-rpo-legacy',
    'studio-gen',
    'generated',
    'openapi.json',
);

/** Default output path for the resolved spec. */
export const DEFAULT_OUTPUT = path.resolve(REPO_ROOT, 'src', 'generator', 'openapi.json');

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

/** CLI entry: build and write the resolved spec, then verify the sheet override. */
async function main(): Promise<void> {
    const result = await writeResolvedSpec();
    assertSheetIsMultipart(result.spec);
    const sheet = result.spec.paths['/v2/workspaces/{workspace_id}/campaigns/sheet']?.post;
    const contentTypes = Object.keys(
        (sheet?.requestBody as { content?: Record<string, unknown> } | undefined)?.content ?? {},
    );
    console.log('[extract] DONE');
    console.log(`  swagger source : ${result.swaggerSource}`);
    console.log(`  paths          : ${result.pathCount}`);
    console.log(`  operations     : ${result.operationCount} (bundle: ${result.bundleOperationCount})`);
    console.log(`  multipart ops  : ${result.multipartCount}`);
    console.log(`  campaigns/sheet: ${contentTypes.join(', ')}  (multipart OK)`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error('[extract] FAILED:', error);
        process.exit(1);
    });
}
