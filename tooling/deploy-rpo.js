// Runner for `npm run deploy:rpo`. Reads the workspace variables from the
// environment and uploads + publishes the RPO artifacts via the compiled SDK.
// The `deploy:rpo` script rebuilds the RPO bundle and `dist` first, so the asset
// that goes live always matches the current src/.
//
// Usage: npm run deploy:rpo -- <live-code.js>...   (verify against live code nodes)
//        npm run deploy:rpo -- --unchecked         (explicitly skip the verification)
const fs = require('node:fs');
const { deployToRpo } = require('../dist/runtime/rpo/deploy.js');
const { extractHabllaReferences } = require('../dist/runtime/rpo/compatibility.js');

const UNCHECKED_FLAG = '--unchecked';

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

/**
 * Resolves the live `globalThis.hablla` members to verify from the CLI arguments: the
 * members referenced by every given code-node source file, or `'unchecked'` when the
 * operator opts out explicitly. Anything else is a usage error.
 */
function liveClientMembersFromArgs(args) {
    if (args.length === 1 && args[0] === UNCHECKED_FLAG) return 'unchecked';
    if (args.length === 0 || args.includes(UNCHECKED_FLAG)) {
        throw new Error(`Pass the live code-node source files to verify against, or ${UNCHECKED_FLAG} alone to skip the check`);
    }
    return [...new Set(args.flatMap((file) => extractHabllaReferences(fs.readFileSync(file, 'utf8'))))];
}

async function main() {
    const liveClientMembers = liveClientMembersFromArgs(process.argv.slice(2));
    if (liveClientMembers !== 'unchecked') console.log(`Live hablla members verified: ${liveClientMembers.join(', ') || '(none)'}`);

    const plan = await deployToRpo(vars, { dryRun: true, liveClientMembers });
    console.log('RPO deploy plan:');
    for (const item of plan) console.log(`  ${item.name}: ${item.bytes} bytes`);

    const results = await deployToRpo(vars, { liveClientMembers });
    console.log('RPO deploy complete:');
    for (const item of results) console.log(`  ${item.name}: status ${item.status} (${item.bytes} bytes)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
