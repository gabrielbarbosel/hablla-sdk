import type { HttpTransport, RetryPolicy } from './types';
import type { AuthStrategy, StrategyCache } from './strategy';
import { MemoryStrategyCache } from './strategy';

export interface AuthConfig {
    workspaceToken: string;
    refreshToken: string;
    firebaseApiKey: string;
    baseUrl: string;
    /** Firebase-refresh retry tuning. Defaults: 6 attempts, 8s backoff cap. */
    retry?: RetryPolicy;
}

interface FirebaseTokenResponse {
    access_token: string;
    expires_in?: string;
    refresh_token?: string;
}

/**
 * Hablla authentication. Provides a Bearer access token (Firebase refresh) and
 * resolves the per-endpoint auth strategy: the workspace token is tried first and
 * Bearer is recorded only when the workspace token is rejected (401/403). Recorded
 * choices live in an injected {@link StrategyCache}, so a durable cache persists
 * them across executions.
 */
export class HabllaAuth {
    private accessToken: string | null = null;
    private expiresAt = 0;
    private pending: Promise<string> | null = null;
    private strategies: Record<string, AuthStrategy> = {};
    private loaded = false;
    private readonly maxAttempts: number;
    private readonly maxBackoffMs: number;

    constructor(
        private readonly transport: HttpTransport,
        private readonly config: AuthConfig,
        private cache: StrategyCache = new MemoryStrategyCache(),
    ) {
        this.maxAttempts = config.retry?.maxAttempts ?? 6;
        this.maxBackoffMs = config.retry?.maxBackoffMs ?? 8_000;
    }

    /** Replaces the strategy cache (e.g. with a durable runtime implementation). */
    useCache(cache: StrategyCache): void {
        this.cache = cache;
        this.loaded = false;
    }

    private get isExpired(): boolean {
        this.syncFromGlobal();
        return !this.accessToken || Date.now() > this.expiresAt - 30_000;
    }

    private syncFromGlobal() {
        const g = globalThis as any;
        if (g.HABLLA_ENV?.accessToken && g.HABLLA_ENV?.accessTokenExp) {
            const exp = Number(g.HABLLA_ENV.accessTokenExp) || 0;
            if (Date.now() < exp - 30_000) {
                this.accessToken = g.HABLLA_ENV.accessToken;
                this.expiresAt = exp;
            }
        }
    }

    private syncToGlobal(accessToken: string, expiresAt: number) {
        this.accessToken = accessToken;
        this.expiresAt = expiresAt;
        const g = globalThis as any;
        if (g.HABLLA_ENV) {
            g.HABLLA_ENV.accessToken = accessToken;
            g.HABLLA_ENV.accessTokenExp = expiresAt;
        }
    }

    /** Returns a valid Bearer access token, refreshing when needed. */
    async token(): Promise<string> {
        this.syncFromGlobal();
        if (this.accessToken && !this.isExpired) return this.accessToken;
        this.pending ??= this.refresh().finally(() => {
            this.pending = null;
        });
        return this.pending;
    }

    /** Authorization header value for a strategy. */
    async authorization(strategy: AuthStrategy): Promise<string> {
        return strategy === 'bearer' ? `Bearer ${await this.token()}` : this.config.workspaceToken;
    }

    /** Strategy to try for an endpoint: the cached choice, otherwise workspace first. */
    async resolveStrategy(cacheKey: string): Promise<AuthStrategy> {
        if (!this.loaded) {
            this.strategies = await this.cache.load();
            this.loaded = true;
        }
        return this.strategies[cacheKey] ?? 'workspace';
    }

    /** Records the working strategy for an endpoint and persists the change. */
    async recordStrategy(cacheKey: string, strategy: AuthStrategy): Promise<void> {
        if (this.strategies[cacheKey] === strategy) return;
        this.strategies[cacheKey] = strategy;
        await this.cache.save(this.strategies);
    }

    /**
     * Resolves a Bearer token while tolerating the cross-isolate refresh race:
     * each attempt first re-reads the shared token from `HABLLA_ENV` (a sibling
     * isolate may have just refreshed it) and only calls Firebase when the shared
     * token is still stale. Transient Firebase failures (e.g. 400 from concurrent
     * refreshes) are retried with exponential backoff and jitter.
     */
    private async refresh(): Promise<string> {
        for (let attempt = 0; ; attempt++) {
            this.syncFromGlobal();
            if (this.accessToken && Date.now() < this.expiresAt - 30_000) return this.accessToken;
            try {
                return await this.refreshOnce();
            } catch (err) {
                if (attempt >= this.maxAttempts - 1) throw err;
                const backoff = Math.min(500 * 2 ** attempt, this.maxBackoffMs) + (Date.now() % 250);
                await new Promise(resolve => setTimeout(resolve, backoff));
            }
        }
    }

    private async refreshOnce(): Promise<string> {
        const key = encodeURIComponent(this.config.firebaseApiKey);
        const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(this.config.refreshToken)}`;
        const res = await this.transport.send<FirebaseTokenResponse>({
            method: 'POST',
            url: `https://securetoken.googleapis.com/v1/token?key=${key}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        if (res.status >= 300 || !res.data?.access_token) {
            throw new Error(`Firebase refresh failed (${res.status})`);
        }
        const expiresAt = Date.now() + Number(res.data.expires_in ?? 3600) * 1000;
        this.syncToGlobal(res.data.access_token, expiresAt);
        return res.data.access_token;
    }
}
