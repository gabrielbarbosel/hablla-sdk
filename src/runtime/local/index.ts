import * as path from 'path';
import * as os from 'os';
import { HabllaClient } from '../../sdk/client';
import type { HabllaVariables } from '../../sdk/variables';
import { AxiosTransport } from './transport';
import { FileStrategyCache } from './file-strategy-cache';

export interface LocalClientConfig extends HabllaVariables {
    /** JSON file that persists the auth strategy map. Defaults to the OS temp dir. */
    strategyCacheFile?: string;
}

/**
 * Creates the SDK for local (Node) use, injecting the axios transport and a
 * file-backed strategy cache. Runs without sandbox limits, so this is where
 * parallel full-dataset scans belong.
 */
export function createHabllaClient(config: LocalClientConfig): HabllaClient {
    const file = config.strategyCacheFile ?? path.join(os.tmpdir(), 'hablla-strategy-cache.json');
    return new HabllaClient({
        workspaceId: config.workspaceId,
        refreshToken: config.refreshToken,
        firebaseApiKey: config.firebaseApiKey,
        workspaceToken: config.workspaceToken,
        baseUrl: config.baseUrl,
        transport: new AxiosTransport(),
        strategyCache: new FileStrategyCache(file),
    });
}

export { HabllaClient } from '../../sdk/client';
export { AxiosTransport } from './transport';
export { FileStrategyCache } from './file-strategy-cache';
