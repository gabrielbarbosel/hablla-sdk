import * as utils from '../../sdk/utils';

/**
 * RPO bootstrap for the shared utils. Bundled into the `W_Utils` class, it exposes
 * the pure utils layer as `globalThis.HABLLA_UTILS` so any class or flow in the
 * workspace consumes them from one place — the same pattern `W_Variables` uses for
 * the environment. Nothing here has state or I/O; it only publishes the functions.
 */
export function installHabllaUtils(): void {
    (globalThis as unknown as { HABLLA_UTILS?: typeof utils }).HABLLA_UTILS = utils;
}

installHabllaUtils();
