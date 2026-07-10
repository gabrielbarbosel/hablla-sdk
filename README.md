# hablla

Typed TypeScript SDK for the **Hablla** API — 104 resources / ~730 operations,
generated from the Hablla studio web bundle (AST-extracted) and the official
swagger, verified against the live API.

```ts
import { createHabllaClient } from 'hablla';

const hablla = createHabllaClient({
    workspaceId: process.env.HABLLA_WORKSPACE_ID!,
    refreshToken: process.env.HABLLA_REFRESH_TOKEN!,
    firebaseApiKey: process.env.HABLLA_FIREBASE_API_KEY!,
    workspaceToken: process.env.HABLLA_WORKSPACE_TOKEN,
});

const persons = await hablla.persons.listPersons({ query: { limit: 50, phone: '55...' } });
const all = await hablla.http.paginate((page, limit) =>
    hablla.persons.listPersons({ query: { page, limit } }));
```

## Architecture

```
src/
├── sdk/
│   ├── core/         HttpTransport (interface, DIP) · HabllaAuth · HabllaHttpClient · query · pagination · strategy · errors
│   ├── resources/    one class per resource (generated: gen_*.ts) + Resource base
│   └── client.ts     HabllaClient — composes every resource over the injected transport
├── runtime/
│   └── local/        AxiosTransport + createHabllaClient + FileStrategyCache (Node)
└── index.ts
```

**Principles:** DIP (the core depends only on the `HttpTransport` port, so the same
SDK runs on Node or inside the Hablla RPO sandbox) · DRY (one auth, one paginator,
one query serializer) · every method: **path params required**, **query params
optional and typed** (undocumented keys allowed), body from the request schema.

**Auth:** per-endpoint strategy — the workspace token is tried first, Bearer
(Firebase refresh) as fallback; the working strategy is cached (`StrategyCache`:
in-memory or file locally, a Hablla script in the RPO runtime).

## Quality

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint
npm test            # vitest
npm run build       # tsc -> dist/
```

## Regeneration

The extraction/generation pipeline (bundle -> deobfuscate -> AST -> OpenAPI ->
classes) lives in `../hablla-rpo-legacy/studio-gen/`, kept out of this package.
