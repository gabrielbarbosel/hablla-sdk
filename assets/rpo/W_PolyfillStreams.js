class W_PolyfillStreams {
    constructor() { this.name = 'W_PolyfillStreams'; }
    async execute(input) {
        var g = typeof globalThis !== 'undefined' ? globalThis : global;
        if (g.__W_POLYFILLSTREAMS_INSTALLED__) return { ok: true, message: 'W_PolyfillStreams already installed' };
        g.__W_POLYFILLSTREAMS_INSTALLED__ = true;

        // ── ReadableStream ─────────────────────────────────────────────────────
        // Spec-faithful default (non-BYOB) ReadableStream with backpressure/pull,
        // getReader/read/cancel/releaseLock/closed, tee, pipeTo/pipeThrough and
        // async iteration.
        function ReadableStream(underlyingSource, strategy) {
            underlyingSource = underlyingSource || {};
            strategy = strategy || {};
            var stream = this;
            stream.locked = false;

            var st = {
                state: 'readable',        // 'readable' | 'closed' | 'errored'
                storedError: undefined,
                queue: [],                // [{ value, size }]
                queueTotalSize: 0,
                closeRequested: false,
                started: false,
                pulling: false,
                pullAgain: false,
                readRequests: [],         // [{ resolve, reject }]
                reader: null
            };
            var hwm = (strategy.highWaterMark != null) ? Number(strategy.highWaterMark) : 1;
            if (isNaN(hwm) || hwm < 0) hwm = 1;
            var sizeAlgorithm = (typeof strategy.size === 'function') ? strategy.size : function () { return 1; };

            function resolveReaderClosed() { if (st.reader && st.reader._resolveClosed) st.reader._resolveClosed(); }
            function rejectReaderClosed(e) { if (st.reader && st.reader._rejectClosed) st.reader._rejectClosed(e); }

            function closeStream() {
                st.state = 'closed';
                var reqs = st.readRequests; st.readRequests = [];
                for (var i = 0; i < reqs.length; i++) reqs[i].resolve({ value: undefined, done: true });
                resolveReaderClosed();
            }
            function errorStream(e) {
                if (st.state !== 'readable') return;
                st.state = 'errored';
                st.storedError = e;
                st.queue = []; st.queueTotalSize = 0;
                var reqs = st.readRequests; st.readRequests = [];
                for (var i = 0; i < reqs.length; i++) reqs[i].reject(e);
                rejectReaderClosed(e);
            }

            function shouldPull() {
                if (st.state !== 'readable') return false;
                if (st.closeRequested) return false;
                if (!st.started) return false;
                if (stream.locked && st.readRequests.length > 0) return true;
                return (hwm - st.queueTotalSize) > 0;
            }
            function callPullIfNeeded() {
                if (!shouldPull()) return;
                if (st.pulling) { st.pullAgain = true; return; }
                st.pulling = true;
                var p;
                try { p = underlyingSource.pull ? underlyingSource.pull(controller) : undefined; }
                catch (e) { st.pulling = false; errorStream(e); return; }
                Promise.resolve(p).then(function () {
                    st.pulling = false;
                    if (st.pullAgain) { st.pullAgain = false; callPullIfNeeded(); }
                }, function (e) { st.pulling = false; errorStream(e); });
            }

            var controller = {
                get desiredSize() {
                    if (st.state === 'errored') return null;
                    if (st.state === 'closed') return 0;
                    return hwm - st.queueTotalSize;
                },
                enqueue: function (chunk) {
                    if (st.closeRequested) throw new TypeError('stream is closing');
                    if (st.state !== 'readable') throw new TypeError('stream is not readable');
                    if (st.readRequests.length > 0) {
                        st.readRequests.shift().resolve({ value: chunk, done: false });
                    } else {
                        var sz = 1;
                        try { sz = Number(sizeAlgorithm(chunk)); } catch (e) { errorStream(e); throw e; }
                        if (isNaN(sz) || sz < 0) sz = 0;
                        st.queue.push({ value: chunk, size: sz });
                        st.queueTotalSize += sz;
                    }
                    callPullIfNeeded();
                },
                close: function () {
                    if (st.closeRequested) throw new TypeError('already closing');
                    if (st.state !== 'readable') throw new TypeError('not readable');
                    st.closeRequested = true;
                    if (st.queue.length === 0) closeStream();
                },
                error: function (e) { errorStream(e); }
            };
            stream._controller = controller;
            stream._st = st;

            function streamCancel(reason) {
                if (st.state === 'closed') return Promise.resolve(undefined);
                if (st.state === 'errored') return Promise.reject(st.storedError);
                st.queue = []; st.queueTotalSize = 0;
                closeStream();
                var res;
                try { res = underlyingSource.cancel ? underlyingSource.cancel(reason) : undefined; }
                catch (e) { return Promise.reject(e); }
                return Promise.resolve(res).then(function () { return undefined; });
            }
            stream._cancel = streamCancel;

            function doRead(reader) {
                if (st.reader !== reader) return Promise.reject(new TypeError('reader has been released'));
                if (st.state === 'errored') return Promise.reject(st.storedError);
                if (st.queue.length > 0) {
                    var pair = st.queue.shift();
                    st.queueTotalSize -= pair.size;
                    if (st.queueTotalSize < 0) st.queueTotalSize = 0;
                    if (st.queue.length === 0 && st.closeRequested) closeStream();
                    else callPullIfNeeded();
                    return Promise.resolve({ value: pair.value, done: false });
                }
                if (st.state === 'closed') return Promise.resolve({ value: undefined, done: true });
                return new Promise(function (resolve, reject) {
                    st.readRequests.push({ resolve: resolve, reject: reject });
                    callPullIfNeeded();
                });
            }
            stream._doRead = doRead;

            stream.getReader = function (opts) {
                if (opts && opts.mode === 'byob') throw new TypeError('BYOB reader is not supported');
                if (stream.locked) throw new TypeError('ReadableStream is already locked');
                stream.locked = true;
                var reader = {};
                var closedResolve, closedReject, settled = false;
                var closedPromise = new Promise(function (res, rej) { closedResolve = res; closedReject = rej; });
                closedPromise.then(function () { }, function () { });
                reader._resolveClosed = function () { if (!settled) { settled = true; closedResolve(); } };
                reader._rejectClosed = function (e) { if (!settled) { settled = true; closedReject(e); } };
                reader.closed = closedPromise;
                reader.read = function () { return doRead(reader); };
                reader.cancel = function (reason) {
                    if (st.reader !== reader) return Promise.reject(new TypeError('reader has been released'));
                    return streamCancel(reason);
                };
                reader.releaseLock = function () {
                    if (st.reader !== reader) return;
                    var reqs = st.readRequests; st.readRequests = [];
                    var err = new TypeError('Reader was released');
                    for (var i = 0; i < reqs.length; i++) reqs[i].reject(err);
                    reader._rejectClosed(err);
                    st.reader = null;
                    stream.locked = false;
                };
                st.reader = reader;
                if (st.state === 'closed') reader._resolveClosed();
                else if (st.state === 'errored') reader._rejectClosed(st.storedError);
                return reader;
            };

            var startResult;
            try { startResult = underlyingSource.start ? underlyingSource.start(controller) : undefined; }
            catch (e) { errorStream(e); startResult = undefined; }
            Promise.resolve(startResult).then(function () {
                st.started = true;
                callPullIfNeeded();
            }, function (e) { errorStream(e); });
        }

        ReadableStream.prototype.cancel = function (reason) {
            if (this.locked) return Promise.reject(new TypeError('Cannot cancel a locked stream'));
            return this._cancel(reason);
        };

        ReadableStream.prototype.tee = function () {
            if (this.locked) throw new TypeError('Cannot tee a locked stream');
            var reader = this.getReader();
            var reading = false, readAgain = false;
            var canceled1 = false, canceled2 = false;
            var reason1, reason2;
            var c1, c2;
            var cancelResolve, cancelReject;
            var cancelPromise = new Promise(function (res, rej) { cancelResolve = res; cancelReject = rej; });
            cancelPromise.then(function () { }, function () { });

            function pullAlgorithm() {
                if (reading) { readAgain = true; return Promise.resolve(); }
                reading = true;
                reader.read().then(function (res) {
                    reading = false;
                    if (res.done) {
                        if (!canceled1) { try { c1.close(); } catch (e) { } }
                        if (!canceled2) { try { c2.close(); } catch (e) { } }
                        return;
                    }
                    var chunk = res.value;
                    if (!canceled1) { try { c1.enqueue(chunk); } catch (e) { } }
                    if (!canceled2) { try { c2.enqueue(chunk); } catch (e) { } }
                    if (readAgain) { readAgain = false; pullAlgorithm(); }
                }, function (err) {
                    reading = false;
                    if (!canceled1) { try { c1.error(err); } catch (e) { } }
                    if (!canceled2) { try { c2.error(err); } catch (e) { } }
                });
                return Promise.resolve();
            }
            function makeCancel(which) {
                return function (reason) {
                    if (which === 1) { canceled1 = true; reason1 = reason; }
                    else { canceled2 = true; reason2 = reason; }
                    if (canceled1 && canceled2) {
                        var c = reader.cancel([reason1, reason2]);
                        Promise.resolve(c).then(cancelResolve, cancelReject);
                    }
                    return cancelPromise;
                };
            }
            var branch1 = new ReadableStream({
                start: function (c) { c1 = c; },
                pull: function () { return pullAlgorithm(); },
                cancel: makeCancel(1)
            });
            var branch2 = new ReadableStream({
                start: function (c) { c2 = c; },
                pull: function () { return pullAlgorithm(); },
                cancel: makeCancel(2)
            });
            return [branch1, branch2];
        };

        ReadableStream.prototype.pipeTo = function (dest, options) {
            options = options || {};
            var source = this;
            var reader, writer;
            try { reader = source.getReader(); } catch (e) { return Promise.reject(e); }
            try { writer = dest.getWriter(); } catch (e) { reader.releaseLock(); return Promise.reject(e); }
            return new Promise(function (resolve, reject) {
                function finalize(fn) {
                    try { reader.releaseLock(); } catch (e) { }
                    try { writer.releaseLock(); } catch (e) { }
                    fn();
                }
                function pump() {
                    reader.read().then(function (res) {
                        if (res.done) {
                            if (options.preventClose) { finalize(function () { resolve(undefined); }); return; }
                            Promise.resolve(writer.close()).then(function () {
                                finalize(function () { resolve(undefined); });
                            }, function (e) { finalize(function () { reject(e); }); });
                            return;
                        }
                        Promise.resolve(writer.write(res.value)).then(pump, function (e) {
                            if (!options.preventCancel) { try { reader.cancel(e); } catch (x) { } }
                            finalize(function () { reject(e); });
                        });
                    }, function (e) {
                        if (!options.preventAbort) { try { writer.abort(e); } catch (x) { } }
                        finalize(function () { reject(e); });
                    });
                }
                pump();
            });
        };

        ReadableStream.prototype.pipeThrough = function (transform, options) {
            if (this.locked) throw new TypeError('Cannot pipeThrough from a locked stream');
            this.pipeTo(transform.writable, options).then(function () { }, function () { });
            return transform.readable;
        };

        ReadableStream.prototype[Symbol.asyncIterator] = function (opts) {
            var reader = this.getReader();
            var preventCancel = opts && opts.preventCancel;
            var iterator = {
                next: function () {
                    return reader.read().then(function (res) {
                        if (res.done) { try { reader.releaseLock(); } catch (e) { } return { value: undefined, done: true }; }
                        return { value: res.value, done: false };
                    });
                },
                'return': function (v) {
                    var p = preventCancel ? Promise.resolve(undefined) : Promise.resolve(reader.cancel(v));
                    return p.then(function () { try { reader.releaseLock(); } catch (e) { } return { value: v, done: true }; });
                }
            };
            iterator[Symbol.asyncIterator] = function () { return this; };
            return iterator;
        };
        ReadableStream.prototype.values = ReadableStream.prototype[Symbol.asyncIterator];

        // ── WritableStream ─────────────────────────────────────────────────────
        function WritableStream(underlyingSink, strategy) {
            underlyingSink = underlyingSink || {};
            strategy = strategy || {};
            var stream = this;
            stream.locked = false;
            var hwm = (strategy.highWaterMark != null) ? Number(strategy.highWaterMark) : 1;
            if (isNaN(hwm) || hwm < 0) hwm = 1;
            var sizeAlgorithm = (typeof strategy.size === 'function') ? strategy.size : function () { return 1; };

            var st = {
                state: 'writable',   // 'writable' | 'closing' | 'closed' | 'errored'
                storedError: undefined,
                started: false,
                queue: [],           // [{ chunk,size,resolve,reject }] or [{ close:true,resolve,reject }]
                queueTotalSize: 0,
                inFlight: false,
                writer: null
            };

            function backpressure() { return (hwm - st.queueTotalSize) <= 0; }

            var controller = {
                get signal() { return undefined; },
                error: function (e) { errorStream(e); }
            };

            function errorStream(e) {
                if (st.state === 'errored' || st.state === 'closed') return;
                st.state = 'errored';
                st.storedError = e;
                var q = st.queue; st.queue = []; st.queueTotalSize = 0;
                for (var i = 0; i < q.length; i++) if (q[i].reject) q[i].reject(e);
                if (st.writer) st.writer._errored(e);
            }

            function processQueue() {
                if (st.inFlight) return;
                if (st.state === 'errored' || st.state === 'closed') return;
                if (st.queue.length === 0) return;
                var item = st.queue[0];
                if (item.close) {
                    st.queue.shift();
                    st.inFlight = true;
                    var cp;
                    try { cp = underlyingSink.close ? underlyingSink.close(controller) : undefined; }
                    catch (e) { st.inFlight = false; errorStream(e); return; }
                    Promise.resolve(cp).then(function () {
                        st.inFlight = false;
                        st.state = 'closed';
                        if (item.resolve) item.resolve(undefined);
                        if (st.writer) st.writer._closedResolve();
                    }, function (e) { st.inFlight = false; errorStream(e); });
                    return;
                }
                st.inFlight = true;
                var wp;
                try { wp = underlyingSink.write ? underlyingSink.write(item.chunk, controller) : undefined; }
                catch (e) { st.inFlight = false; st.queue.shift(); item.reject(e); errorStream(e); return; }
                Promise.resolve(wp).then(function () {
                    st.inFlight = false;
                    st.queue.shift();
                    st.queueTotalSize -= item.size;
                    if (st.queueTotalSize < 0) st.queueTotalSize = 0;
                    item.resolve(undefined);
                    if (st.writer) st.writer._updateReady();
                    processQueue();
                }, function (e) {
                    st.inFlight = false;
                    st.queue.shift();
                    item.reject(e);
                    errorStream(e);
                });
            }
            stream._st = st;

            stream.getWriter = function () {
                if (stream.locked) throw new TypeError('WritableStream is already locked');
                stream.locked = true;
                var writer = {};
                var readyResolve, readyPromise;
                function newReady() {
                    readyPromise = new Promise(function (r) { readyResolve = r; });
                    readyPromise.then(function () { }, function () { });
                    if (!backpressure()) readyResolve();
                }
                newReady();
                var closedResolve, closedReject, closedSettled = false;
                var closedPromise = new Promise(function (res, rej) { closedResolve = res; closedReject = rej; });
                closedPromise.then(function () { }, function () { });

                writer._updateReady = function () {
                    if (!backpressure()) { if (readyResolve) readyResolve(); }
                    else newReady();
                };
                writer._errored = function (e) { if (readyResolve) readyResolve(); if (!closedSettled) { closedSettled = true; closedReject(e); } };
                writer._closedResolve = function () { if (!closedSettled) { closedSettled = true; closedResolve(); } };

                Object.defineProperty(writer, 'ready', { get: function () { return readyPromise; } });
                writer.closed = closedPromise;
                Object.defineProperty(writer, 'desiredSize', {
                    get: function () {
                        if (st.state === 'errored') return null;
                        if (st.state === 'closed') return 0;
                        return hwm - st.queueTotalSize;
                    }
                });
                writer.write = function (chunk) {
                    if (st.writer !== writer) return Promise.reject(new TypeError('writer has been released'));
                    if (st.state === 'errored') return Promise.reject(st.storedError);
                    if (st.state === 'closed' || st.state === 'closing') return Promise.reject(new TypeError('stream is closing or closed'));
                    var sz = 1;
                    try { sz = Number(sizeAlgorithm(chunk)); } catch (e) { errorStream(e); return Promise.reject(e); }
                    if (isNaN(sz) || sz < 0) sz = 0;
                    return new Promise(function (resolve, reject) {
                        st.queue.push({ chunk: chunk, size: sz, resolve: resolve, reject: reject });
                        st.queueTotalSize += sz;
                        writer._updateReady();
                        if (st.started) processQueue();
                    });
                };
                writer.close = function () {
                    if (st.writer !== writer) return Promise.reject(new TypeError('writer has been released'));
                    if (st.state === 'errored') return Promise.reject(st.storedError);
                    if (st.state === 'closed' || st.state === 'closing') return Promise.reject(new TypeError('stream is already closing or closed'));
                    st.state = 'closing';
                    return new Promise(function (resolve, reject) {
                        st.queue.push({ close: true, resolve: resolve, reject: reject });
                        if (st.started) processQueue();
                    });
                };
                writer.abort = function (reason) {
                    if (st.writer !== writer) return Promise.reject(new TypeError('writer has been released'));
                    if (st.state === 'errored') return Promise.reject(st.storedError);
                    if (st.state === 'closed') return Promise.resolve(undefined);
                    var ap;
                    try { ap = underlyingSink.abort ? underlyingSink.abort(reason) : undefined; }
                    catch (e) { errorStream(e); return Promise.reject(e); }
                    errorStream(reason !== undefined ? reason : new TypeError('The stream was aborted'));
                    return Promise.resolve(ap).then(function () { return undefined; });
                };
                writer.releaseLock = function () {
                    if (st.writer !== writer) return;
                    var err = new TypeError('Writer was released');
                    if (!closedSettled) { closedSettled = true; closedReject(err); }
                    st.writer = null;
                    stream.locked = false;
                };
                st.writer = writer;
                if (st.state === 'errored') writer._errored(st.storedError);
                else if (st.state === 'closed') writer._closedResolve();
                return writer;
            };

            var startResult;
            try { startResult = underlyingSink.start ? underlyingSink.start(controller) : undefined; }
            catch (e) { errorStream(e); }
            Promise.resolve(startResult).then(function () {
                st.started = true;
                processQueue();
            }, function (e) { errorStream(e); });
        }

        WritableStream.prototype.abort = function (reason) {
            if (this.locked) return Promise.reject(new TypeError('Cannot abort a locked stream'));
            var w = this.getWriter();
            var p = w.abort(reason);
            w.releaseLock();
            return p;
        };
        WritableStream.prototype.close = function () {
            if (this.locked) return Promise.reject(new TypeError('Cannot close a locked stream'));
            var w = this.getWriter();
            var p = w.close();
            w.releaseLock();
            return p;
        };

        // ── TransformStream ────────────────────────────────────────────────────
        function TransformStream(transformer, writableStrategy, readableStrategy) {
            transformer = transformer || {};
            writableStrategy = writableStrategy || {};
            readableStrategy = readableStrategy || {};
            var readableController, writableController;

            var transformController = {
                get desiredSize() { return readableController ? readableController.desiredSize : null; },
                enqueue: function (chunk) { readableController.enqueue(chunk); },
                error: function (e) {
                    if (readableController) readableController.error(e);
                    if (writableController) writableController.error(e);
                },
                terminate: function () {
                    if (readableController) { try { readableController.close(); } catch (e) { } }
                    if (writableController) writableController.error(new TypeError('TransformStream was terminated'));
                }
            };

            function performTransform(chunk) {
                if (typeof transformer.transform === 'function') {
                    try { return Promise.resolve(transformer.transform(chunk, transformController)); }
                    catch (e) { transformController.error(e); return Promise.reject(e); }
                }
                try { readableController.enqueue(chunk); return Promise.resolve(); }
                catch (e) { return Promise.reject(e); }
            }

            var readable = new ReadableStream({
                start: function (c) { readableController = c; },
                pull: function () { },
                cancel: function (reason) { if (writableController) writableController.error(reason); }
            }, {
                highWaterMark: readableStrategy.highWaterMark != null ? readableStrategy.highWaterMark : 0,
                size: readableStrategy.size
            });

            var writable = new WritableStream({
                start: function (c) { writableController = c; },
                write: function (chunk) { return performTransform(chunk); },
                close: function () {
                    if (typeof transformer.flush === 'function') {
                        return Promise.resolve(transformer.flush(transformController)).then(function () {
                            try { readableController.close(); } catch (e) { }
                        }, function (e) { transformController.error(e); throw e; });
                    }
                    try { readableController.close(); } catch (e) { }
                    return Promise.resolve();
                },
                abort: function (reason) { if (readableController) readableController.error(reason); }
            }, {
                highWaterMark: writableStrategy.highWaterMark != null ? writableStrategy.highWaterMark : 1,
                size: writableStrategy.size
            });

            if (typeof transformer.start === 'function') transformer.start(transformController);

            this.readable = readable;
            this.writable = writable;
        }

        // ── force-install (substitui a versao quebrada/ausente do host) ─────────
        g.ReadableStream = ReadableStream;
        g.WritableStream = WritableStream;
        g.TransformStream = TransformStream;

        return { ok: true, message: 'W_PolyfillStreams installed' };
    }
}

await (new W_PolyfillStreams()).execute();
