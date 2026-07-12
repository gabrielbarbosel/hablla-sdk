import { HabllaClient } from '../../sdk/client';
import type { HabllaVariables } from '../../sdk/variables';
import { HostTransport } from './transport';
import { GlobalStrategyCache } from './global-strategy-cache';

interface RpoGlobal {
    HABLLA_ENV?: Partial<HabllaVariables>;
    hablla?: HabllaClient;
}

/**
 * RPO bootstrap. Instantiates the client from the variables injected by
 * `W_Variables` (as `globalThis.HABLLA_ENV`) over the host transport, and exposes
 * it as `globalThis.hablla`. This module is bundled into `W_HabllaClient.js` and
 * runs when the sandbox loads that class. No credentials live here — they come
 * from `HABLLA_ENV`, injected at deploy time.
 */
export function installHabllaClient(): HabllaClient {
    const g = globalThis as unknown as RpoGlobal;
    const env = g.HABLLA_ENV ?? {};
    const client = new HabllaClient({
        workspaceId: env.workspaceId ?? '',
        refreshToken: env.refreshToken ?? '',
        firebaseApiKey: env.firebaseApiKey ?? '',
        workspaceToken: env.workspaceToken,
        baseUrl: env.baseUrl,
        debug: env.debug,
        transport: new HostTransport(),
        strategyCache: new GlobalStrategyCache(),
    });
    g.hablla = client;
    return client;
}

installHabllaClient();
