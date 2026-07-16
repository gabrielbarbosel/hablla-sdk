import type { HabllaClient } from '../../sdk/client';
import { HabllaDomain } from '../../sdk/domain';

interface RpoGlobal {
    hablla?: HabllaClient;
    habllaDomain?: HabllaDomain;
}

/**
 * RPO bootstrap for the domain layer. Bundled into `W_HabllaDomain`, it reads the
 * pure client published by `W_HabllaClient` (`globalThis.hablla`), composes the
 * domain orchestrators over it, and exposes them as `globalThis.habllaDomain`.
 *
 * The client is never re-bundled here — it is imported as a type only, so the domain
 * bundle carries just our orchestration logic. The shared utils are externalized to
 * `globalThis.HABLLA_UTILS` by the build, exactly as in the client bundle. The deploy
 * order (`W_HabllaClient` before `W_HabllaDomain`) guarantees `globalThis.hablla` is
 * already set when this runs.
 */
export function installHabllaDomain(): HabllaDomain {
    const g = globalThis as unknown as RpoGlobal;
    const client = g.hablla;
    if (!client) {
        throw new Error('W_HabllaDomain: globalThis.hablla ausente — W_HabllaClient precisa rodar antes.');
    }
    const domain = new HabllaDomain(client);
    g.habllaDomain = domain;
    return domain;
}

installHabllaDomain();
