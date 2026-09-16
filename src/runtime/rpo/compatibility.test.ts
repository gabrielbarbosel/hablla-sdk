import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { extractHabllaReferences, findMissingMembers, listHabllaSurface } from './compatibility';

const ASSETS = path.join(__dirname, '..', '..', '..', 'assets', 'rpo');

function asset(name: string): string {
    return fs.readFileSync(path.join(ASSETS, `${name}.js`), 'utf8');
}

/** Shape of the SDK-built client bundle: resources over a base class, published by an installer. */
const CLIENT_BUNDLE = `
class W_Client {
    async execute() {
        const g = typeof globalThis !== "undefined" ? globalThis : global;
        (() => {
            var Resource = class { constructor(http) { this.http = http; } http; };
            var Persons = class extends Resource { list() {} get(id) {} };
            var Client = class {
                persons;
                constructor(config) { this.persons = new Persons(config); }
            };
            function install() {
                const g = globalThis;
                const client = new Client({});
                g.hablla = client;
                return client;
            }
            install();
        })();
    }
}
await new W_Client().execute();
`;

/** Shape of the domain bundle: reads the published client and attaches a legacy facade member. */
const DOMAIN_BUNDLE = `
class W_Domain {
    async execute() {
        (() => {
            var Dispatch = class { constructor(client) { this.client = client; } client; async run(input, spec) {} };
            var Domain = class { dispatch; constructor(client) { this.dispatch = new Dispatch(client); } };
            function install() {
                const g = globalThis;
                const client = g.hablla;
                const domain = new Domain(client);
                client.dispatch = domain.dispatch;
                g.habllaDomain = domain;
            }
            install();
        })();
    }
}
await new W_Domain().execute();
`;

describe('extractHabllaReferences', () => {
    it('extracts member paths from a flow code node with top-level await/return', () => {
        const source = `
            /** Delegates to hablla.dispatch — mentions in comments and "hablla.x.y" strings are ignored. */
            const spec = { label: "hablla.persons.list" };
            return await hablla.dispatch.run($input, spec);
        `;
        expect(extractHabllaReferences(source)).toEqual(['dispatch.run']);
    });

    it('follows the global object, aliases and optional chaining, and caps paths at two levels', () => {
        const source = `
            const h = globalThis.hablla;
            const again = h;
            await again?.persons?.list({ query: 1 });
            await hablla.services.update(id, body).then((r) => r.data.items);
            if (typeof hablla === "undefined") throw new Error("no client");
            return hablla.auth;
        `;
        expect(extractHabllaReferences(source)).toEqual(['auth', 'persons.list', 'services.update']);
    });

    it('ignores a local binding that shadows the global', () => {
        const source = `
            function run(hablla) { return hablla.anything.here(); }
            const other = { hablla: 1 };
            return run(other);
        `;
        expect(extractHabllaReferences(source)).toEqual([]);
    });

    it('fails loudly on usages it cannot verify', () => {
        expect(() => extractHabllaReferences('return hablla[name].run();')).toThrow(/cannot be verified/);
        expect(() => extractHabllaReferences('const { dispatch } = hablla; return dispatch.run();')).toThrow(/cannot be verified/);
        expect(() => extractHabllaReferences('return helper(hablla);')).toThrow(/cannot be verified/);
        expect(() => extractHabllaReferences('return globalThis.hablla;')).toThrow(/cannot be verified/);
    });

    it('rejects source that does not parse', () => {
        expect(() => extractHabllaReferences('return hablla.dispatch.run(')).toThrow(/Live code is not valid JavaScript/);
    });
});

describe('listHabllaSurface', () => {
    it('lists the published instance members two levels deep, including inherited ones', () => {
        expect(listHabllaSurface({ W_Client: CLIENT_BUNDLE })).toEqual(['persons', 'persons.get', 'persons.http', 'persons.list']);
    });

    it('adds members attached to the global by a later bundle', () => {
        expect(listHabllaSurface({ W_Client: CLIENT_BUNDLE, W_Domain: DOMAIN_BUNDLE })).toEqual([
            'dispatch',
            'dispatch.client',
            'dispatch.run',
            'persons',
            'persons.get',
            'persons.http',
            'persons.list',
        ]);
    });

    it('fails when no bundle publishes the global', () => {
        expect(() => listHabllaSurface({ W_Domain: DOMAIN_BUNDLE })).toThrow(/No bundle publishes globalThis.hablla/);
    });

    it('fails when the published value cannot be resolved to a class', () => {
        const bundle = 'class W_X { async execute() { globalThis.hablla = makeClient(); } }';
        expect(() => listHabllaSurface({ W_X: bundle })).toThrow(/class cannot be resolved/);
    });

    it('exposes hablla.dispatch.run from the real bundles only through the domain facade', () => {
        const client = asset('W_HabllaClient');
        const clientOnly = listHabllaSurface({ W_HabllaClient: client });
        expect(clientOnly).toContain('persons.addEmails');
        expect(clientOnly).not.toContain('dispatch.run');

        const withDomain = listHabllaSurface({ W_HabllaClient: client, W_HabllaDomain: asset('W_HabllaDomain') });
        expect(withDomain).toContain('dispatch.run');
    });
});

describe('findMissingMembers', () => {
    it('returns the sorted, de-duplicated required paths absent from the surface', () => {
        expect(findMissingMembers(['dispatch.run', 'b.x', 'b.x', 'persons.list'], ['persons', 'persons.list'])).toEqual(['b.x', 'dispatch.run']);
    });
});
