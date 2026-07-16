import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosRequestConfig } from 'axios';
import type { HabllaVariables } from '../../sdk/variables';

const ASSETS = path.join(__dirname, '..', '..', '..', 'assets', 'gas');

/** SDK version, stamped into the deployed Variables so the live env self-identifies. */
function sdkVersion(): string {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf8')).version ?? '0.0.0';
    } catch {
        return '0.0.0';
    }
}

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
    /**
     * Directory holding the app-owned files (`Code`, `App.html`, `appsscript.json`, ...).
     * When set, those files are the AUTHORITATIVE project content: the target project's
     * existing files are replaced, so the deploy is fully deterministic (repo -> project,
     * byte for byte). `HabllaClient` and `Variables` are always SDK-generated and are
     * ignored here even if the directory vendors a copy. When omitted, the legacy
     * behavior applies: only the two SDK files are pushed and everything else in the
     * target is preserved.
     */
    projectDir?: string;
}

/** The bundled SDK client (`assets/gas/HabllaClient.gs`), produced by `tooling/build-gas.js`. */
function clientSource(): string {
    return fs.readFileSync(path.join(ASSETS, 'HabllaClient.gs'), 'utf8');
}

/** Maps a source-file extension to the Apps Script content type, or null if unsupported. */
function gasType(ext: string): GasFile['type'] | null {
    if (ext === '.html') return 'HTML';
    if (ext === '.json') return 'JSON';
    if (ext === '.gs' || ext === '.js') return 'SERVER_JS';
    return null;
}

/**
 * Reads the app-owned files from a project directory into the shape updateContent
 * expects. Dotfiles (e.g. `.clasp.json`) and the two SDK-generated files
 * (`HabllaClient`, `Variables`) are skipped: the SDK owns those and always regenerates
 * them, so a vendored copy in the directory must never shadow the freshly built one.
 * The Apps Script file name is the base name without extension (`appsscript.json` ->
 * `appsscript`).
 */
function readProjectFiles(dir: string): GasFile[] {
    const files: GasFile[] = [];

    for (const entry of fs.readdirSync(dir)) {
        if (entry.startsWith('.')) continue;

        const ext = path.extname(entry);
        const name = path.basename(entry, ext);
        if (name === CLIENT_FILE || name === VARIABLES_FILE) continue;

        const type = gasType(ext);
        if (!type) continue;

        files.push({ name, type, source: fs.readFileSync(path.join(dir, entry), 'utf8') });
    }

    return files;
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
            sheetId: vars.sheetId ?? '',
            sdkVersion: sdkVersion(),
            // Warm-token slots (parity with RPO). GAS is single-threaded so there is no
            // herd here, but a refresher may still seed these to skip the refresh call.
            accessToken: vars.accessToken ?? '',
            accessTokenExp: vars.accessTokenExp ?? 0,
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
 * Builds the file set to upload. Variables is placed FIRST so it is evaluated before
 * HabllaClient (which calls `installHabllaClient()` at load, reading `HABLLA_ENV`).
 *
 * When `authoritative` is given (from {@link DeployOptions.projectDir}), those files are
 * the app content: the target's existing files are dropped, so the result equals the
 * repo byte for byte. Otherwise the legacy path preserves the target's own files
 * (`kept`) and only upserts the two SDK files. A default manifest is added only when
 * neither source provides one.
 */
function mergeFiles(existing: GasFile[], vars: HabllaVariables, authoritative?: GasFile[]): { files: GasFile[]; plan: DeployItem[] } {
    const variables: GasFile = { name: VARIABLES_FILE, type: 'SERVER_JS', source: variablesSource(vars) };
    const client: GasFile = { name: CLIENT_FILE, type: 'SERVER_JS', source: clientSource() };

    const existingNames = new Set(existing.map((f) => f.name));
    const actionFor = (name: string): DeployItem['action'] => (existingNames.has(name) ? 'replaced' : 'added');

    const plan: DeployItem[] = [
        { name: VARIABLES_FILE, bytes: variables.source.length, action: actionFor(VARIABLES_FILE) },
        { name: CLIENT_FILE, bytes: client.source.length, action: actionFor(CLIENT_FILE) },
    ];

    const others = authoritative ?? existing.filter((f) => f.name !== VARIABLES_FILE && f.name !== CLIENT_FILE);
    for (const f of others) plan.push({ name: f.name, bytes: f.source.length, action: authoritative ? actionFor(f.name) : 'kept' });

    const hasManifest = others.some((f) => f.name === 'appsscript');
    const manifest = hasManifest ? [] : [DEFAULT_MANIFEST];
    if (!hasManifest) plan.push({ name: DEFAULT_MANIFEST.name, bytes: DEFAULT_MANIFEST.source.length, action: 'added' });

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
 * `HabllaClient.gs` plus a generated `Variables.gs` carrying the given credentials.
 * With `opts.projectDir` the app-owned files (`Code`, `App.html`, `appsscript.json`)
 * are pushed from the repo as the authoritative content, making the whole project
 * deterministic (repo -> project, byte for byte); without it, the target's own files
 * are preserved. The GAS analog of {@link deployToRpo}.
 *
 * Note: the Apps Script REST API cannot set Script Properties, so credentials are
 * injected via `Variables.gs` (which sets `globalThis.HABLLA_ENV`) — NOT via Script
 * Properties. `entry.ts` already prefers `HABLLA_ENV`, so runtime creds cost zero
 * Property reads. Pass `{ dryRun: true }` to preview the plan without any API call.
 */
export async function deployToGas(vars: HabllaVariables, opts: DeployOptions = {}): Promise<DeployItem[]> {
    const authoritative = opts.projectDir ? readProjectFiles(opts.projectDir) : undefined;

    if (opts.dryRun) {
        return mergeFiles([], vars, authoritative).plan;
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

    const { files, plan } = mergeFiles(existing, vars, authoritative);

    await putContent(base, files, {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
    });

    return plan;
}
