import { Resource } from './base';

/** `payment-intervals` resource (generated from openapi.json). */
export class PaymentIntervals extends Resource {
    /**
     * deletePaymentInterval.
     * @method DELETE /v1/workspaces/{workspace_id}/payment-intervals/{payment_interval_id}
     * @remarks Any query params may be sent (none documented).
     */
    deletePaymentInterval(paymentIntervalId: string, opts: { query?: Record<string, unknown> } = {}): Promise<void> {
        return this.http.delete('/v1/workspaces/{workspace_id}/payment-intervals/{payment_interval_id}', { path: { payment_interval_id: paymentIntervalId }, query: opts.query });
    }

    /**
     * getPaymentInterval.
     * @method GET /v1/workspaces/{workspace_id}/payment-intervals/{payment_interval_id}
     * @remarks Any query params may be sent (none documented).
     */
    getPaymentInterval(paymentIntervalId: string, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/payment-intervals/{payment_interval_id}', { path: { payment_interval_id: paymentIntervalId }, query: opts.query });
    }

    /**
     * updatePaymentInterval.
     * @method PUT /v1/workspaces/{workspace_id}/payment-intervals/{payment_interval_id}
     * @remarks Any query params may be sent (none documented).
     */
    updatePaymentInterval(paymentIntervalId: string, body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.put('/v1/workspaces/{workspace_id}/payment-intervals/{payment_interval_id}', { path: { payment_interval_id: paymentIntervalId }, body, query: opts.query });
    }

    /**
     * listPaymentIntervals.
     * @method GET /v1/workspaces/{workspace_id}/payment-intervals
     * @remarks Documented query: filters (extra keys allowed).
     */
    listPaymentIntervals(opts: { query?: { filters?: string } & Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.get('/v1/workspaces/{workspace_id}/payment-intervals', { query: opts.query });
    }

    /**
     * createPaymentInterval.
     * @method POST /v1/workspaces/{workspace_id}/payment-intervals
     * @remarks Any query params may be sent (none documented).
     */
    createPaymentInterval(body: Record<string, unknown>, opts: { query?: Record<string, unknown> } = {}): Promise<unknown> {
        return this.http.post('/v1/workspaces/{workspace_id}/payment-intervals', { body, query: opts.query });
    }
}
