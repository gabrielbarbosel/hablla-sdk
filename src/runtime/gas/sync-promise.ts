/**
 * Promise SÍNCRONO — a peça central do "docker" GAS.
 *
 * O Apps Script não pode devolver Promise pro `google.script.run`, e todo I/O do GAS
 * (`UrlFetchApp`) é síncrono. Bundlando o SDK em es2015, o esbuild rebaixa `async/await`
 * para gerador + helper `__async` que usa o `Promise` GLOBAL. Se o global for este
 * Promise síncrono (que roda os callbacks na hora, sem microtask), a cadeia async
 * inteira resolve inline, e {@link unwrap} extrai o valor de forma síncrona.
 *
 * Só é correto porque no GAS todo await encadeado é sobre trabalho síncrono
 * (UrlFetchApp + setTimeout polifilado síncrono). Não use em ambiente com I/O real.
 */
type State = 'pending' | 'fulfilled' | 'rejected';

interface Handler {
    onFulfilled?: (value: unknown) => unknown;
    onRejected?: (reason: unknown) => unknown;
    next: SyncPromise<unknown>;
}

/**
 * Rejeições que assentaram sem NENHUMA continuação (`then`/`catch`) — o análogo
 * síncrono do `unhandledrejection`. Sem isso, uma promise rejeitada e descartada
 * (fire-and-forget) sumiria em silêncio. O {@link runSync} drena esta lista no
 * `finally` e emite um aviso, então um erro engolido sempre deixa rastro.
 */
interface PendingRejection {
    promise: SyncPromise<unknown>;
    reason: unknown;
}

const unhandledRejections: PendingRejection[] = [];

function trackUnhandled(promise: SyncPromise<unknown>, reason: unknown): void {
    unhandledRejections.push({ promise, reason });
}

function untrackUnhandled(promise: SyncPromise<unknown>): void {
    for (let i = unhandledRejections.length - 1; i >= 0; i--) {
        if (unhandledRejections[i]?.promise === promise) unhandledRejections.splice(i, 1);
    }
}

/**
 * Remove e retorna as razões das rejeições que nunca ganharam uma continuação.
 * Chamado pelo {@link runSync} ao encerrar; some no chão vira um aviso visível.
 */
export function drainUnhandledRejections(): unknown[] {
    const reasons = unhandledRejections.map((entry) => entry.reason);
    unhandledRejections.length = 0;
    return reasons;
}

export class SyncPromise<T = unknown> {
    private state: State = 'pending';
    private value: unknown;
    private handlers: Handler[] = [];
    /** True assim que QUALQUER continuação é anexada — a rejeição flui pra jusante e é reportada só na cauda. */
    private handled = false;

    constructor(executor?: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void) {
        if (!executor) return;
        try {
            executor((v) => this.settle('fulfilled', v), (e) => this.settle('rejected', e));
        } catch (error) {
            this.settle('rejected', error);
        }
    }

    private settle(state: 'fulfilled' | 'rejected', value: unknown): void {
        if (this.state !== 'pending') return;
        if (state === 'fulfilled' && value && typeof (value as { then?: unknown }).then === 'function') {
            (value as PromiseLike<unknown>).then((v) => this.settle('fulfilled', v), (e) => this.settle('rejected', e));
            return;
        }
        this.state = state;
        this.value = value;
        // Rejeição sem continuação anexada: registra como não-tratada até que um
        // `then`/`catch` a consuma (aí `handled` já estará true e pulamos isto).
        if (state === 'rejected' && !this.handled) trackUnhandled(this as SyncPromise<unknown>, value);
        const handlers = this.handlers;
        this.handlers = [];
        handlers.forEach((h) => this.run(h));
    }

    private run(handler: Handler): void {
        const cb = this.state === 'fulfilled' ? handler.onFulfilled : handler.onRejected;
        if (typeof cb !== 'function') {
            handler.next.settle(this.state as 'fulfilled' | 'rejected', this.value);
            return;
        }
        try {
            handler.next.settle('fulfilled', cb(this.value));
        } catch (error) {
            handler.next.settle('rejected', error);
        }
    }

    then<R1 = T, R2 = never>(
        onFulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
        onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
    ): SyncPromise<R1 | R2> {
        // Anexar QUALQUER continuação consome a rejeição desta promise: ela passa a
        // fluir para `next`, que será reportado se terminar rejeitado e sem consumidor.
        this.handled = true;
        untrackUnhandled(this as SyncPromise<unknown>);
        const next = new SyncPromise<R1 | R2>();
        const handler: Handler = {
            onFulfilled: onFulfilled as Handler['onFulfilled'],
            onRejected: onRejected as Handler['onRejected'],
            next: next as SyncPromise<unknown>,
        };
        if (this.state === 'pending') this.handlers.push(handler);
        else this.run(handler);
        return next;
    }

    catch<R = never>(onRejected?: ((reason: unknown) => R | PromiseLike<R>) | null): SyncPromise<T | R> {
        return this.then(undefined, onRejected);
    }

    finally(onFinally?: (() => void) | null): SyncPromise<T> {
        return this.then(
            (v) => { onFinally?.(); return v; },
            (e) => { onFinally?.(); throw e; },
        );
    }

    static resolve<V>(value?: V | PromiseLike<V>): SyncPromise<V> {
        return new SyncPromise<V>((resolve) => resolve(value as V));
    }

    static reject<V = never>(reason?: unknown): SyncPromise<V> {
        return new SyncPromise<V>((_, reject) => reject(reason));
    }

    static all<V>(items: Iterable<V | PromiseLike<V>>): SyncPromise<V[]> {
        return new SyncPromise<V[]>((resolve, reject) => {
            const list = Array.from(items);
            const out: V[] = new Array(list.length);
            let remaining = list.length;
            if (remaining === 0) { resolve(out); return; }
            list.forEach((item, index) => {
                SyncPromise.resolve(item).then((v) => {
                    out[index] = v;
                    if (--remaining === 0) resolve(out);
                }, reject);
            });
        });
    }

    static allSettled<V>(items: Iterable<V | PromiseLike<V>>): SyncPromise<Array<{ status: string; value?: V; reason?: unknown }>> {
        return SyncPromise.all(
            Array.from(items).map((item) =>
                SyncPromise.resolve(item).then(
                    (value) => ({ status: 'fulfilled', value }),
                    (reason) => ({ status: 'rejected', reason }),
                ),
            ),
        );
    }

    static race<V>(items: Iterable<V | PromiseLike<V>>): SyncPromise<V> {
        return new SyncPromise<V>((resolve, reject) => {
            for (const item of items) SyncPromise.resolve(item).then(resolve, reject);
        });
    }
}

/** Extrai o valor de uma promise JÁ resolvida (síncrona). Lança se rejeitou ou se ficou pendente. */
export function unwrap<T>(promise: PromiseLike<T>): T {
    let resolved = false;
    let rejected = false;
    let value: T;
    let reason: unknown;
    promise.then((v) => { resolved = true; value = v; }, (e) => { rejected = true; reason = e; });
    if (rejected) throw reason;
    if (!resolved) throw new Error('Chamada do SDK não resolveu de forma síncrona (I/O assíncrono num runtime síncrono?).');
    return value!;
}
