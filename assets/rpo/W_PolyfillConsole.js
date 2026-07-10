class W_PolyfillConsole {
    constructor() { this.name = 'W_PolyfillConsole'; }
    async execute(input) {
        var g = typeof globalThis !== 'undefined' ? globalThis : global;
        if (g.__W_POLYFILLCONSOLE_INSTALLED__) return { ok: true, message: 'W_PolyfillConsole already installed' };
        g.__W_POLYFILLCONSOLE_INSTALLED__ = true;

        if (typeof g.console === "undefined") {
            g.console = {
                log: function () { },
                error: function () { },
                warn: function () { },
                info: function () { },
                debug: function () { }
            };
        }
        return { ok: true, message: 'W_PolyfillConsole installed' };
    }
}

await(new W_PolyfillConsole()).execute();
