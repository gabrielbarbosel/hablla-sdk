import type { Clock } from '../../sdk/domain/dispatch/workspace';

/** Apps Script bindings the clock uses. */
declare const Utilities: { sleep(ms: number): void };

/** {@link Clock} of Apps Script: wall-clock time and a blocking sleep that resolves inline under `runSync`. */
export const gasClock: Clock = {
    now: () => Date.now(),
    sleep: (ms: number) => {
        Utilities.sleep(ms);
        return Promise.resolve();
    },
};
