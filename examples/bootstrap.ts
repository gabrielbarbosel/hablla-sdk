/**
 * Example bootstrap — THIS is your code, in your app, outside the package. You
 * declare the variables once (from wherever you keep them: process.env, a vault,
 * literals) and use the same object for BOTH the local client and the RPO deploy.
 * The `hablla` package never reads your environment; it only receives values.
 */
import { createHabllaClient, deployToRpo, extractHabllaReferences, type HabllaVariables } from 'hablla';

const vars: HabllaVariables = {
    workspaceId: process.env.HABLLA_WORKSPACE_ID ?? '',
    refreshToken: process.env.HABLLA_REFRESH_TOKEN ?? '',
    firebaseApiKey: process.env.HABLLA_FIREBASE_API_KEY ?? '',
    workspaceToken: process.env.HABLLA_WORKSPACE_TOKEN,
};

/** The local client, built from the same variables the RPO deploy receives. */
export const hablla = createHabllaClient(vars);

export async function listSomePersons() {
    return hablla.persons.listPersons({ query: { limit: 10 } });
}

/**
 * Previews the RPO deploy with the SAME variables as the local client. In regression
 * mode it refuses bundles that drop a `hablla` member the live flow code nodes use and
 * the published runtime still exposes; members already missing today come back in
 * `alreadyMissingMembers`. Upload + publish with the same call without `dryRun`.
 * @param liveCodeNodeSources Source of every live flow code node.
 * @param publishedBundles Class bodies currently published in the workspace, by class name.
 */
export async function deploy(liveCodeNodeSources: string[], publishedBundles: Record<string, string>) {
    const liveClientMembers = liveCodeNodeSources.flatMap(extractHabllaReferences);
    const plan = await deployToRpo(vars, { dryRun: true, compatibility: { mode: 'regression', liveClientMembers, publishedBundles } });
    console.log('RPO deploy plan:', plan);
}
