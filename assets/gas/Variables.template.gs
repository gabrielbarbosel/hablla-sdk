// Variables.gs — declara as variáveis que o client GAS precisa. Os VALORES são
// injetados no deploy (do ambiente do operador) no marcador abaixo; NUNCA são
// commitados. Seta globalThis.HABLLA_ENV no shape camelCase que o HabllaClient.gs
// (o SDK bundlado) lê em readVariables(). Precisa ser avaliado ANTES do
// HabllaClient.gs — o deployToGas garante essa ordem no array de arquivos.
(function () {
    var g = typeof globalThis !== "undefined" ? globalThis : this;
    g.HABLLA_ENV = /*__HABLLA_ENV__*/ {
        workspaceId: "",
        workspaceToken: "",
        refreshToken: "",
        firebaseApiKey: "",
        baseUrl: "https://api.hablla.com",
        debug: false,
    };
})();
