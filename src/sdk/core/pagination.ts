import type { Paged } from './types';

export interface PaginateOptions {
    /** Items per page. */
    limit?: number;
    /** Pages fetched in parallel. */
    concurrency?: number;
    /** Retries per page on 429/5xx/network, with exponential backoff. */
    retries?: number;
    /** Extra rounds: failed pages go to the end of the queue and are retried. */
    slaRounds?: number;
    /** First page (to resume via cursor). */
    startPage?: number;
    /** Maximum pages per call (the RPO sandbox is stateless; pair with `nextPage`). */
    maxPages?: number;
    /** Processes each page as it arrives, without accumulating; then `items` is empty. */
    eachPage?: (items: unknown[], page: number) => void;
}

export interface PaginateResult<T> {
    items: T[];
    processed: number;
    totalItems: number;
    totalPages: number;
    fetchedPages: number;
    failedPages: number[];
    nextPage: number | null;
    done: boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function statusOf(err: unknown): number | undefined {
    const e = err as { status?: number; response?: { status?: number } } | null;
    return e?.status ?? e?.response?.status;
}

/**
 * Fetches every page of a paginated endpoint with bounded concurrency, per-page
 * retries and SLA rounds that requeue failures, so all data is collected even
 * when some pages fail transiently. Use `eachPage` to stream without accumulating,
 * and `startPage`/`maxPages` with the returned `nextPage` to resume across
 * stateless RPO executions.
 */
export async function paginate<T>(
    fetchPage: (page: number, limit: number) => Promise<Paged<T>>,
    opts: PaginateOptions = {},
): Promise<PaginateResult<T>> {
    const limit = opts.limit ?? 100;
    const concurrency = opts.concurrency ?? 4;
    const retries = opts.retries ?? 2;
    const slaRounds = opts.slaRounds ?? 3;
    const startPage = opts.startPage ?? 1;
    const maxPages = opts.maxPages ?? Infinity;
    const eachPage = opts.eachPage;

    const byPage: Record<number, T[]> = {};
    let processed = 0;
    let fetchedPages = 0;

    const take = (items: T[], page: number): void => {
        processed += items.length;
        fetchedPages += 1;
        if (eachPage) eachPage(items, page);
        else byPage[page] = items;
    };

    const fetchWithRetry = async (page: number): Promise<Paged<T>> => {
        let lastErr: unknown;
        for (let attempt = 0; attempt <= retries; attempt += 1) {
            try {
                return await fetchPage(page, limit);
            } catch (err) {
                lastErr = err;
                const status = statusOf(err);
                if (status != null && status < 500 && status !== 429) throw err;
                await sleep(300 * 2 ** attempt);
            }
        }
        throw lastErr;
    };

    const head = await fetchWithRetry(startPage);
    const totalPages = head.totalPages || 1;
    const totalItems = head.totalItems ?? head.results.length;
    const lastPage = Math.min(totalPages, startPage + maxPages - 1);
    take(head.results, startPage);

    let queue: number[] = [];
    for (let p = startPage + 1; p <= lastPage; p += 1) queue.push(p);
    const failedPages: number[] = [];

    for (let round = 0; round <= slaRounds; round += 1) {
        if (queue.length === 0) break;
        const pending = queue;
        queue = [];
        const retryable: number[] = [];

        for (let i = 0; i < pending.length; i += concurrency) {
            const slice = pending.slice(i, i + concurrency);
            await Promise.all(
                slice.map(async (page) => {
                    try {
                        const res = await fetchWithRetry(page);
                        take(res.results, page);
                    } catch {
                        retryable.push(page);
                    }
                }),
            );
        }
        queue = retryable;
        if (round === slaRounds) failedPages.push(...retryable);
    }

    const items = eachPage ? [] : Object.keys(byPage).sort((a, b) => Number(a) - Number(b)).flatMap((p) => byPage[Number(p)]!);
    const nextPage = lastPage < totalPages ? lastPage + 1 : null;
    return {
        items,
        processed,
        totalItems,
        totalPages,
        fetchedPages,
        failedPages,
        nextPage,
        done: failedPages.length === 0 && nextPage === null,
    };
}
