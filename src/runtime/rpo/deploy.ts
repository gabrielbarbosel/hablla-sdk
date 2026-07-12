import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosRequestConfig } from 'axios';
import type { HabllaVariables } from '../../sdk/variables';

const ASSETS = path.join(__dirname, '..', '..', '..', 'assets', 'rpo');

/** Wall-clock ceiling for every deploy HTTP call, so a hung request can never stall the deploy. */
const REQUEST_TIMEOUT_MS = 30000;

/** How many times to retry an idempotent PUT on a transient failure before giving up. */
const PUT_MAX_ATTEMPTS = 3;

/** Base backoff between PUT retries; grows linearly per attempt. */
const PUT_RETRY_DELAY_MS = 500;

const CLASS_ORDER = [
    'W_PolyfillCore',
    'W_PolyfillBuffer',
    'W_PolyfillConsole',
    'W_PolyfillFetch',
    'W_PolyfillAxios',
    'W_PolyfillStreams',
    'W_Variables',
    'W_Utils',
    'W_Cache',
    'W_HabllaClient',
] as const;

interface WorkspaceClass {
    id?: string;
    _id?: string;
    name: string;
    label?: string;
    is_public?: boolean;
    is_enable?: boolean;
}

export interface DeployItem {
    name: string;
    bytes: number;
    status?: number;
    skipped?: string;
}

export interface DeployOptions {
    /** When true, returns the plan without uploading anything. */
    dryRun?: boolean;
}

function jsCode(name: string, vars: HabllaVariables): string {
    if (name === 'W_Variables') {
        const template = fs.readFileSync(path.join(ASSETS, 'W_Variables.template.js'), 'utf8');
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
    return fs.readFileSync(path.join(ASSETS, `${name}.js`), 'utf8');
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function firebaseBearer(vars: HabllaVariables): Promise<string> {
    const key = encodeURIComponent(vars.firebaseApiKey);
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(vars.refreshToken)}`;
    const res = await axios.post<{ access_token: string }>(`https://securetoken.googleapis.com/v1/token?key=${key}`, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
    });
    if (res.status >= 300) throw new Error(`Firebase refresh failed (${res.status})`);
    return res.data.access_token;
}

/**
 * PUTs a class body, retrying on transient failures. The PUT is idempotent (it
 * replaces the draft js_code for a fixed class id), so a retry is always safe.
 * A definitive `>= 300` status is treated as a hard failure and is not retried.
 */
async function putClass(url: string, body: unknown, config: AxiosRequestConfig): Promise<number> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PUT_MAX_ATTEMPTS; attempt++) {
        try {
            const res = await axios.put(url, body, config);
            if (res.status >= 300) throw new Error(`PUT failed (${res.status})`);
            return res.status;
        } catch (err) {
            lastError = err;
            if (attempt < PUT_MAX_ATTEMPTS) await delay(PUT_RETRY_DELAY_MS * attempt);
        }
    }
    throw lastError;
}

/**
 * Deploys the RPO artifacts (polyfills + W_Variables with the given variables +
 * the bundled W_HabllaClient) to the workspace and publishes. The variables are
 * supplied by the caller — the same object used to instantiate the local client.
 * Pass `{ dryRun: true }` to preview the plan without uploading.
 */
export async function deployToRpo(vars: HabllaVariables, opts: DeployOptions = {}): Promise<DeployItem[]> {
    const baseUrl = vars.baseUrl ?? 'https://api.hablla.com';
    const plan: DeployItem[] = CLASS_ORDER.map((name) => ({ name, bytes: jsCode(name, vars).length }));
    if (opts.dryRun) return plan;

    const token = await firebaseBearer(vars);
    const base = `${baseUrl}/v1/workspaces/${vars.workspaceId}`;
    const headers = { Authorization: `Bearer ${token}` };

    const list = await axios.get<{ results?: WorkspaceClass[] } | WorkspaceClass[]>(`${base}/classes`, {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
    });
    if (list.status >= 300) throw new Error(`GET /classes failed (${list.status})`);
    const classes = Array.isArray(list.data) ? list.data : (list.data.results ?? []);
    if (classes.length === 0) throw new Error('GET /classes returned no classes — refusing to deploy against an empty workspace');
    const byName = new Map(classes.map((c) => [c.name, c]));

    const results: DeployItem[] = [];
    for (const name of CLASS_ORDER) {
        const cls = byName.get(name);
        const code = jsCode(name, vars);
        if (!cls) {
            throw new Error(`Required class ${name} is missing from the workspace — aborting deploy`);
        }
        const id = cls.id ?? cls._id;
        // Only echo optional visibility fields when the listing actually provided them,
        // so a missing field never gets sent as undefined and reverts a live class to its
        // default (unpublished / disabled / no label).
        const body: Record<string, unknown> = { name: cls.name, js_code: code };
        if (cls.label !== undefined) body.label = cls.label;
        if (cls.is_public !== undefined) body.is_public = cls.is_public;
        if (cls.is_enable !== undefined) body.is_enable = cls.is_enable;
        const status = await putClass(`${base}/classes/${id}`, body, {
            headers,
            timeout: REQUEST_TIMEOUT_MS,
            validateStatus: () => true,
        });
        results.push({ name, status, bytes: code.length });
    }

    const publish = await axios.post(`${base}/classes/publish`, {}, {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
    });
    if (publish.status >= 300) throw new Error(`Publish failed (${publish.status}) — drafts uploaded but nothing went live`);

    return results;
}
