import type { HabllaClient } from '../../sdk/client';
import { HabllaDomain } from '../../sdk/domain';
import type { Dispatch } from '../../sdk/domain';

/**
 * The client as flow code nodes written for SDK v0.1.x see it: the client itself
 * carried the per-contact dispatcher (`hablla.dispatch.run`), removed from the pure
 * client in v0.2.0.
 */
type LegacyHabllaClient = HabllaClient & { dispatch?: Dispatch };

interface RpoGlobal {
    hablla?: LegacyHabllaClient;
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
 *
 * Compatibility facade: `hablla.dispatch` is re-exposed as the very same
 * {@link Dispatch} instance as `habllaDomain.dispatch`, so live code nodes calling
 * `hablla.dispatch.run(input, spec)` keep working across the v0.1.x → v0.2.x deploy
 * (`Dispatch.run` is unchanged since v0.1.5). It lives in the RPO runtime only — the
 * SDK client stays pure. Remove it once no live code node references `hablla.dispatch`.
 */
export function installHabllaDomain(): HabllaDomain {
    const g = globalThis as unknown as RpoGlobal;
    const client = g.hablla;
    if (!client) {
        throw new Error('W_HabllaDomain: globalThis.hablla ausente — W_HabllaClient precisa rodar antes.');
    }
    const domain = new HabllaDomain(client);
    client.dispatch = domain.dispatch;
    g.habllaDomain = domain;
    return domain;
}

installHabllaDomain();
