/**
 * Environment variables required to instantiate a Hablla client. They are supplied
 * by the consumer at instantiation time (from their own environment); this package
 * NEVER reads a `.env` file or `process.env` itself. Runtimes inject these values:
 * the constructor locally, or `W_Variables` (as `globalThis.HABLLA_ENV`) in the RPO
 * sandbox.
 */
export interface HabllaVariables {
    /** Workspace id. */
    workspaceId: string;
    /** Firebase refresh token used to mint Bearer access tokens. */
    refreshToken: string;
    /** Firebase Web API key (for the securetoken refresh endpoint). */
    firebaseApiKey: string;
    /** Workspace (public API) token; tried before Bearer, per endpoint. */
    workspaceToken?: string;
    /** API base URL. Defaults to `https://api.hablla.com`. */
    baseUrl?: string;
    /** When true, the client keeps a call trace and enriches API errors with the
     *  failing request + recent calls. Toggle via `HABLLA_ENV.debug` in W_Variables. */
    debug?: boolean;
}

/** Names of the variables as environment keys, for documentation and injection. */
export const HABLLA_VARIABLE_KEYS = {
    workspaceId: 'HABLLA_WORKSPACE_ID',
    workspaceToken: 'HABLLA_WORKSPACE_TOKEN',
    refreshToken: 'HABLLA_REFRESH_TOKEN',
    firebaseApiKey: 'HABLLA_FIREBASE_API_KEY',
    baseUrl: 'HABLLA_BASE_URL',
} as const;
