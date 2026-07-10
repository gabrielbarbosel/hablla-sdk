/**
 * Example bootstrap — THIS is your code, in your app, outside the package. You
 * declare the variables once (from wherever you keep them: process.env, a vault,
 * literals) and use the same object for BOTH the local client and the RPO deploy.
 * The `hablla` package never reads your environment; it only receives values.
 */
import { createHabllaClient, deployToRpo, type HabllaVariables } from 'hablla';

const vars: HabllaVariables = {
    workspaceId: process.env.HABLLA_WORKSPACE_ID ?? '',
    refreshToken: process.env.HABLLA_REFRESH_TOKEN ?? '',
    firebaseApiKey: process.env.HABLLA_FIREBASE_API_KEY ?? '',
    workspaceToken: process.env.HABLLA_WORKSPACE_TOKEN,
};

// 1) Use it locally.
export const hablla = createHabllaClient(vars);

export async function listSomePersons() {
    return hablla.persons.listPersons({ query: { limit: 10 } });
}

// 2) Deploy the RPO with the SAME variables (preview first, then upload).
export async function deploy() {
    const plan = await deployToRpo(vars, { dryRun: true });
    console.log('RPO deploy plan:', plan);
    // await deployToRpo(vars); // uncomment to actually upload + publish
}
