import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosRequestConfig } from 'axios';
import type { HabllaVariables } from '../../sdk/variables';

const ASSETS = path.join(__dirname, '..', '..', '..', 'assets', 'gas');

/** Apps Script REST API — projects.getContent / projects.updateContent. */
const SCRIPT_API = 'https://script.googleapis.com/v1/projects';

/** Wall-clock ceiling for every deploy HTTP call, so a hung request can never stall the deploy. */
const REQUEST_TIMEOUT_MS = 30000;

/** How many times to retry the idempotent PUT (updateContent) on a transient failure. */
const PUT_MAX_ATTEMPTS = 3;

/** Base backoff between PUT retries; grows linearly per attempt. */
const PUT_RETRY_DELAY_MS = 500;

/** Logical name of the bundled SDK script file (Apps Script names have no extension). */
const CLIENT_FILE = 'HabllaClient';

/** Logical name of the generated credentials file. Evaluated BEFORE the client (see order below). */
const VARIABLES_FILE = 'Variables';

/** Apps Script file, in the shape projects.updateContent expects. */
interface GasFile {
    name: string;
    type: 'SERVER_JS' | 'HTML' | 'JSON';
    source: string;
}

/** Default manifest used only when the target project has none. Pins the V8 runtime. */
const DEFAULT_MANIFEST: GasFile = {
    name: 'appsscript',
    type: 'JSON',
    source: JSON.stringify(
        {
            timeZone: 'America/Sao_Paulo',
            dependencies: {},
            exceptionLogging: 'STACKDRIVER',
            runtimeVersion: 'V8',
        },
        null,
        2,
    ),
};

export interface DeployItem {
    name: string;
    bytes: number;
    action?: 'replaced' | 'added' | 'kept';
}

export interface DeployOptions {
    /** When true, returns the plan without contacting the Apps Script API. */
    dryRun?: boolean;
    /** Target Apps Script project id (required for a real deploy). */
    scriptId?: string;
    /** Google OAuth access token with the script.projects scope (required for a real deploy). */
    accessToken?: string;
}

/** The bundled SDK client (`assets/gas/HabllaClient.gs`), produced by `tooling/build-gas.js`. */
function clientSource(): string {
    return fs.readFileSync(path.join(ASSETS, 'HabllaClient.gs'), 'utf8');
}

/**
 * The `Variables.gs` with the given credentials injected into its marker — the GAS
 * analog of the RPO `W_Variables`. `entry.ts` reads `globalThis.HABLLA_ENV` before
 * ever touching Script Properties, so injecting here keeps the creds out of both the
 * committed `.gs` and the Script Properties quota. Never persisted to disk.
 */
function variablesSource(vars: HabllaVariables): string {
    const template = fs.readFileSync(path.join(ASSETS, 'Variables.template.gs'), 'utf8');
    const env = JSON.stringify(
        {
            workspaceId: vars.workspaceId,
            workspaceToken: vars.workspaceToken ?? '',
            refreshToken: vars.refreshToken,
            firebaseApiKey: vars.firebaseApiKey,
            baseUrl: vars.baseUrl ?? 'https://api.hablla.com',
            debug: vars.debug ?? false,
        },
        null,
        8,
    );
    return template.replace(/\/\*__HABLLA_ENV__\*\/[\s\S]*?\};/, `/*__HABLLA_ENV__*/ ${env};`);
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Merges the two SDK-owned files into the project's existing file set. Variables is
 * placed FIRST so it is evaluated before HabllaClient (which calls
 * `installHabllaClient()` at load, reading `HABLLA_ENV`). Any other file the operator
 * has (their `Code`, a custom manifest) is preserved untouched; a manifest is added
 * only if the project has none.
 */
function mergeFiles(existing: GasFile[], vars: HabllaVariables): { files: GasFile[]; plan: DeployItem[] } {
    const variables: GasFile = { name: VARIABLES_FILE, type: 'SERVER_JS', source: variablesSource(vars) };
    const client: GasFile = { name: CLIENT_FILE, type: 'SERVER_JS', source: clientSource() };

    const plan: DeployItem[] = [
        { name: VARIABLES_FILE, bytes: variables.source.length, action: existing.some((f) => f.name === VARIABLES_FILE) ? 'replaced' : 'added' },
        { name: CLIENT_FILE, bytes: client.source.length, action: existing.some((f) => f.name === CLIENT_FILE) ? 'replaced' : 'added' },
    ];

    const others = existing.filter((f) => f.name !== VARIABLES_FILE && f.name !== CLIENT_FILE);
    for (const f of others) plan.push({ name: f.name, bytes: f.source.length, action: 'kept' });

    const hasManifest = others.some((f) => f.name === 'appsscript');
    const manifest = hasManifest ? [] : [DEFAULT_MANIFEST];
    if (!hasManifest) plan.push({ name: DEFAULT_MANIFEST.name, bytes: DEFAULT_MANIFEST.source.length, action: 'added' });

    // Variables before client; the rest (incl. manifest) after.
    return { files: [variables, client, ...others, ...manifest], plan };
}

/**
 * Issues the updateContent PUT, retrying on transient failures. updateContent is
 * idempotent (it replaces the whole project content), so a retry is always safe. A
 * definitive `>= 300` status is a hard failure and is not retried.
 */
async function putContent(url: string, files: GasFile[], config: AxiosRequestConfig): Promise<number> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PUT_MAX_ATTEMPTS; attempt++) {
        try {
            const res = await axios.put(url, { files }, config);
            if (res.status >= 300) throw new Error(`updateContent failed (${res.status})`);
            return res.status;
        } catch (err) {
            lastError = err;
            if (attempt < PUT_MAX_ATTEMPTS) await delay(PUT_RETRY_DELAY_MS * attempt);
        }
    }
    throw lastError;
}

/**
 * Deploys the GAS client to an Apps Script project: pushes the bundled
 * `HabllaClient.gs` plus a generated `Variables.gs` carrying the given credentials,
 * preserving whatever else the project already has. The GAS analog of
 * {@link deployToRpo}: same shape (dry-run plan, template injection from the caller's
 * variables, list-then-upsert so a live file is never blindly clobbered).
 *
 * Note: the Apps Script REST API cannot set Script Properties, so credentials are
 * injected via `Variables.gs` (which sets `globalThis.HABLLA_ENV`) — NOT via Script
 * Properties. `entry.ts` already prefers `HABLLA_ENV`, so runtime creds cost zero
 * Property reads. Pass `{ dryRun: true }` to preview the plan without any API call.
 */
export async function deployToGas(vars: HabllaVariables, opts: DeployOptions = {}): Promise<DeployItem[]> {
    if (opts.dryRun) {
        // No project to read; report the two SDK-owned files (the merge with the live
        // project only affects which existing files are kept, not what we upload).
        return mergeFiles([], vars).plan;
    }

    if (!opts.scriptId) throw new Error('deployToGas requires opts.scriptId (the Apps Script project id)');
    if (!opts.accessToken) throw new Error('deployToGas requires opts.accessToken (a Google OAuth token with the script.projects scope)');

    const headers = { Authorization: `Bearer ${opts.accessToken}` };
    const base = `${SCRIPT_API}/${encodeURIComponent(opts.scriptId)}/content`;

    const current = await axios.get<{ files?: GasFile[] }>(base, {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
    });
    if (current.status >= 300) throw new Error(`getContent failed (${current.status}) — check scriptId and token scope`);
    const existing = current.data.files ?? [];

    const { files, plan } = mergeFiles(existing, vars);

    await putContent(base, files, {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
    });

    return plan;
}
