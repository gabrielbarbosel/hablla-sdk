// W_Variables — declares the variables the RPO client needs. The actual VALUES are
// injected at deploy time (from the operator's environment) into the marker below;
// they are NEVER committed. Sets globalThis.HABLLA_ENV in the camelCase shape that
// W_HabllaClient (the bundled SDK) reads.
class W_Variables {
    constructor() {
        this.name = "W_Variables";
    }
    async execute() {
        const g = typeof globalThis !== "undefined" ? globalThis : global;
        g.HABLLA_ENV = /*__HABLLA_ENV__*/ {
            workspaceId: "",
            workspaceToken: "",
            refreshToken: "",
            firebaseApiKey: "",
            baseUrl: "https://api.hablla.com",
            debug: false,
        };
        return { ok: true };
    }
}

await new W_Variables().execute();
