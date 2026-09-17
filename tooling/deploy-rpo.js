// Runner for `npm run deploy:rpo`. Reads the workspace variables from the
// environment and uploads + publishes the RPO artifacts via the compiled SDK.
// The `deploy:rpo` script rebuilds the RPO bundle and `dist` first, so the asset
// that goes live always matches the current src/.
//
// Usage: npm run deploy:rpo -- <live-code.js>...                                  (strict: every live member must be exposed)
//        npm run deploy:rpo -- --published <W_Class.js>... <live-code.js>...      (regression: only members dropped from the published runtime block)
//        npm run deploy:rpo -- --unchecked                                        (explicitly skip the verification)
const fs = require('node:fs');
const path = require('node:path');
const { deployToRpo } = require('../dist/runtime/rpo/deploy.js');
const { extractHabllaReferences } = require('../dist/runtime/rpo/compatibility.js');

const UNCHECKED_FLAG = '--unchecked';

const PUBLISHED_FLAG = '--published';

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
 * Builds the compatibility check from the CLI arguments: `--unchecked` alone opts out
 * explicitly; otherwise every positional argument is a live code-node source file, and
 * each `--published <file>` is a currently published class body (named after the file)
 * that switches the check to regression mode. Anything else is a usage error.
 */
function compatibilityFromArgs(args) {
    if (args.length === 1 && args[0] === UNCHECKED_FLAG) return { mode: 'unchecked' };
    const liveFiles = [];
    const publishedBundles = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i] === UNCHECKED_FLAG) throw new Error(`${UNCHECKED_FLAG} must be the only argument`);
        if (args[i] !== PUBLISHED_FLAG) {
            liveFiles.push(args[i]);
            continue;
        }
        const file = args[++i];
        if (!file) throw new Error(`${PUBLISHED_FLAG} needs a class body file`);
        publishedBundles[path.basename(file, '.js')] = fs.readFileSync(file, 'utf8');
    }
    if (liveFiles.length === 0) {
        throw new Error(`Pass the live code-node source files to verify against, or ${UNCHECKED_FLAG} alone to skip the check`);
    }
    const liveClientMembers = [...new Set(liveFiles.flatMap((file) => extractHabllaReferences(fs.readFileSync(file, 'utf8'))))];
    return Object.keys(publishedBundles).length > 0
        ? { mode: 'regression', liveClientMembers, publishedBundles }
        : { mode: 'strict', liveClientMembers };
}

async function main() {
    const compatibility = compatibilityFromArgs(process.argv.slice(2));
    if (compatibility.mode !== 'unchecked') {
        console.log(`Live hablla members verified (${compatibility.mode}): ${compatibility.liveClientMembers.join(', ') || '(none)'}`);
    }

    const plan = await deployToRpo(vars, { dryRun: true, compatibility });
    console.log('RPO deploy plan:');
    for (const item of plan.items) console.log(`  ${item.name}: ${item.bytes} bytes`);
    for (const member of plan.alreadyMissingMembers) console.warn(`  warning: hablla.${member} is used by live code but already missing from the published runtime`);

    const report = await deployToRpo(vars, { compatibility });
    console.log('RPO deploy complete:');
    for (const item of report.items) console.log(`  ${item.name}: status ${item.status} (${item.bytes} bytes)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
