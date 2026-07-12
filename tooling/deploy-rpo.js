// Runner for `npm run deploy:rpo`. Reads the workspace variables from the
// environment and uploads + publishes the RPO artifacts via the compiled SDK.
// The `deploy:rpo` script rebuilds the RPO bundle and `dist` first, so the asset
// that goes live always matches the current src/.
const { deployToRpo } = require('../dist/runtime/rpo/deploy.js');

const vars = {
    workspaceId: process.env.HABLLA_WORKSPACE_ID ?? '',
    refreshToken: process.env.HABLLA_REFRESH_TOKEN ?? '',
    firebaseApiKey: process.env.HABLLA_FIREBASE_API_KEY ?? '',
    workspaceToken: process.env.HABLLA_WORKSPACE_TOKEN,
    baseUrl: process.env.HABLLA_BASE_URL,
    debug: process.env.HABLLA_DEBUG === 'true',
};

const missing = ['workspaceId', 'refreshToken', 'firebaseApiKey'].filter((k) => !vars[k]);
if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
}

async function main() {
    const plan = await deployToRpo(vars, { dryRun: true });
    console.log('RPO deploy plan:');
    for (const item of plan) console.log(`  ${item.name}: ${item.bytes} bytes`);

    const results = await deployToRpo(vars);
    console.log('RPO deploy complete:');
    for (const item of results) console.log(`  ${item.name}: status ${item.status} (${item.bytes} bytes)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
