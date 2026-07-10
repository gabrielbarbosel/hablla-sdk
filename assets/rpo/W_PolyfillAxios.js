class W_PolyfillAxios {
    constructor() { this.name = 'W_PolyfillAxios'; }
    async execute(input) {
        var g = typeof globalThis !== 'undefined' ? globalThis : global;
        if (g.__W_POLYFILLAXIOS_INSTALLED__) return { ok: true, message: 'W_PolyfillAxios already installed' };
        g.__W_POLYFILLAXIOS_INSTALLED__ = true;

        if (typeof g.axios === "undefined") {
            g.axios = function axios(config) {
                if (typeof config === "string") config = { url: config, method: "GET" };
                config = config || {};
                var method = (config.method || "GET").toUpperCase();
                var headers = config.headers || {};
                var data = config.data;
                var url = config.url;

                // Simple fetch mock for axios
                return g.fetch(url, {
                    method: method,
                    headers: headers,
                    body: (data !== undefined && typeof data !== "string") ? JSON.stringify(data) : data
                }).then(function (res) {
                    return res.text().then(function (text) {
                        var parsed = text;
                        try { parsed = JSON.parse(text); } catch (e) { }
                        var response = {
                            data: parsed,
                            status: res.status,
                            statusText: res.statusText,
                            headers: {},
                            config: config,
                            request: {}
                        };
                        res.headers.forEach(function (v, k) { response.headers[k] = v; });
                        if (config.validateStatus && !config.validateStatus(res.status)) {
                            var err = new Error("Request failed with status code " + res.status);
                            err.response = response;
                            err.isAxiosError = true;
                            throw err;
                        }
                        return response;
                    });
                });
            };
            g.axios.create = function (defaults) {
                defaults = defaults || {};
                var instance = function (config) {
                    if (typeof config === "string") config = { url: config };
                    var merged = { headers: {} };
                    Object.assign(merged, defaults, config);
                    Object.assign(merged.headers, defaults.headers, config.headers);
                    return g.axios(merged);
                };
                ['get', 'delete', 'head', 'options'].forEach(function (m) {
                    instance[m] = function (url, config) {
                        return instance(Object.assign(config || {}, { method: m, url: url }));
                    };
                });
                ['post', 'put', 'patch'].forEach(function (m) {
                    instance[m] = function (url, data, config) {
                        return instance(Object.assign(config || {}, { method: m, url: url, data: data }));
                    };
                });
                return instance;
            };
            ['get', 'delete', 'head', 'options', 'post', 'put', 'patch'].forEach(function (m) {
                g.axios[m] = g.axios.create()[m];
            });
            g.axios.defaults = { headers: { common: {} }, baseURL: "", timeout: 0 };
            g.axios.interceptors = { request: { use: function () { } }, response: { use: function () { } } };
            g.axios.isAxiosError = function (e) { return e && e.isAxiosError === true; };
        }
        return { ok: true, message: 'W_PolyfillAxios installed' };
    }
}

await(new W_PolyfillAxios()).execute();
