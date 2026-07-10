import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import type { HabllaVariables } from '../../sdk/variables';

const ASSETS = path.join(__dirname, '..', '..', '..', 'assets', 'rpo');

const CLASS_ORDER = [
    'W_PolyfillCore',
    'W_PolyfillBuffer',
    'W_PolyfillConsole',
    'W_PolyfillAxios',
    'W_PolyfillStreams',
    'W_PolyfillFetch',
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

async function firebaseBearer(vars: HabllaVariables): Promise<string> {
    const key = encodeURIComponent(vars.firebaseApiKey);
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(vars.refreshToken)}`;
    const res = await axios.post<{ access_token: string }>(`https://securetoken.googleapis.com/v1/token?key=${key}`, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        validateStatus: () => true,
    });
    if (res.status >= 300) throw new Error(`Firebase refresh failed (${res.status})`);
    return res.data.access_token;
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

    const list = await axios.get<{ results?: WorkspaceClass[] } | WorkspaceClass[]>(`${base}/classes`, { headers, validateStatus: () => true });
    const classes = Array.isArray(list.data) ? list.data : (list.data.results ?? []);
    const byName = new Map(classes.map((c) => [c.name, c]));

    const results: DeployItem[] = [];
    for (const name of CLASS_ORDER) {
        const cls = byName.get(name);
        const code = jsCode(name, vars);
        if (!cls) {
            results.push({ name, bytes: code.length, skipped: 'not in workspace' });
            continue;
        }
        const id = cls.id ?? cls._id;
        const res = await axios.put(
            `${base}/classes/${id}`,
            { name: cls.name, label: cls.label, is_public: cls.is_public, is_enable: cls.is_enable, js_code: code },
            { headers, validateStatus: () => true },
        );
        if (res.status >= 300) throw new Error(`PUT ${name} failed (${res.status})`);
        results.push({ name, status: res.status, bytes: code.length });
    }
    await axios.post(`${base}/classes/publish`, {}, { headers, validateStatus: () => true });
    return results;
}
