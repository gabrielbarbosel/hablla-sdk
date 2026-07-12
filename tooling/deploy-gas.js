// Runner for `npm run deploy:gas`. Reads the workspace variables + the Apps Script
// target (scriptId + Google OAuth token) from the environment and pushes the GAS
// artifacts via the compiled SDK. The `deploy:gas` script rebuilds the GAS bundle
// and `dist` first, so the .gs that goes live always matches the current src/.
//
// The Google OAuth access token must carry the `script.projects` scope (e.g. from
// `clasp login` credentials or a service account). This runner does NOT fetch it —
// supply it via GOOGLE_ACCESS_TOKEN, mirroring how the SDK never reads secrets itself.
const { deployToGas } = require('../dist/runtime/gas/deploy.js');

const vars = {
    workspaceId: process.env.HABLLA_WORKSPACE_ID ?? '',
    refreshToken: process.env.HABLLA_REFRESH_TOKEN ?? '',
    firebaseApiKey: process.env.HABLLA_FIREBASE_API_KEY ?? '',
    workspaceToken: process.env.HABLLA_WORKSPACE_TOKEN,
    baseUrl: process.env.HABLLA_BASE_URL,
    debug: process.env.HABLLA_DEBUG === 'true',
};

const opts = {
    scriptId: process.env.GAS_SCRIPT_ID,
    accessToken: process.env.GOOGLE_ACCESS_TOKEN,
};

const missing = [];
if (!vars.workspaceId) missing.push('HABLLA_WORKSPACE_ID');
if (!vars.refreshToken) missing.push('HABLLA_REFRESH_TOKEN');
if (!vars.firebaseApiKey) missing.push('HABLLA_FIREBASE_API_KEY');
if (!opts.scriptId) missing.push('GAS_SCRIPT_ID');
if (!opts.accessToken) missing.push('GOOGLE_ACCESS_TOKEN');
if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
}

async function main() {
    const plan = await deployToGas(vars, { dryRun: true });
    console.log('GAS deploy plan:');
    for (const item of plan) console.log(`  ${item.name}: ${item.bytes} bytes`);

    const results = await deployToGas(vars, opts);
    console.log('GAS deploy complete:');
    for (const item of results) console.log(`  ${item.name}: ${item.action} (${item.bytes} bytes)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
