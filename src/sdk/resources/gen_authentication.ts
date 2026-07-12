import { Resource } from './base';

/** `authentication` resource (generated from openapi.json). */
export class Authentication extends Resource {
    /**
     * forgotPassword.
     * @method POST /v1/authentication/forgot-password
     * @remarks Any query params may be sent (none documented).
     */
    forgotPassword(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/authentication/forgot-password', { body, query: opts.query });
    }

    /**
     * login.
     * @method POST /v1/authentication/login
     * @remarks Any query params may be sent (none documented).
     */
    login(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/authentication/login', { body, query: opts.query });
    }

    /**
     * registerWithExternal.
     * @method POST /v1/authentication/register-with-external
     * @remarks Any query params may be sent (none documented).
     */
    registerWithExternal(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/authentication/register-with-external', { body, query: opts.query });
    }

    /**
     * registerWithPassword.
     * @method POST /v1/authentication/register-with-password
     * @remarks Any query params may be sent (none documented).
     */
    registerWithPassword(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/authentication/register-with-password', { body, query: opts.query });
    }

    /**
     * resendEmailVerification.
     * @method POST /v1/authentication/resend-email-verification
     * @remarks Any query params may be sent (none documented).
     */
    resendEmailVerification(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/authentication/resend-email-verification', { body, query: opts.query });
    }

    /**
     * resetPassword.
     * @method POST /v1/authentication/reset-password
     * @remarks Any query params may be sent (none documented).
     */
    resetPassword(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/authentication/reset-password', { body, query: opts.query });
    }

    /**
     * getVerifyEmail.
     * @method GET /v1/authentication/verify-email
     * @remarks Any query params may be sent (none documented).
     */
    getVerifyEmail(opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/authentication/verify-email', { query: opts.query, queryFormat: 'json' });
    }
}
