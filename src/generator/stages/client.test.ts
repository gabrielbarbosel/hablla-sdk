import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, it, expect } from 'vitest';

import { CLIENT_FILE, emitClientFile, readResourceBindings, ResourceBinding } from './client';
import { promoteResources } from './promote';

const SDK_DIR = path.resolve(__dirname, '..', '..', 'sdk');

const temporaryDirs: string[] = [];

/** Create a scratch directory holding the given files, removed after each test. */
function dirWith(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hablla-client-'));
    temporaryDirs.push(dir);
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
    return dir;
}

/** Source of a minimal generated resource file. */
function resourceSource(className: string): string {
    return `import { Resource } from './base';\n\nexport class ${className} extends Resource {\n}\n`;
}

afterEach(() => {
    for (const dir of temporaryDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('emitClientFile', () => {
    it('reproduces the committed client from the committed resources', () => {
        const emitted = emitClientFile(readResourceBindings(path.join(SDK_DIR, 'resources')));
        expect(emitted).toBe(fs.readFileSync(path.join(SDK_DIR, CLIENT_FILE), 'utf8'));
    });

    it('drops every trace of a removed resource', () => {
        const dir = dirWith({ 'gen_tags.ts': resourceSource('Tags'), 'gen_tempTokens.ts': resourceSource('TempTokens') });
        const before = emitClientFile(readResourceBindings(dir));
        fs.rmSync(path.join(dir, 'gen_tempTokens.ts'));
        const after = emitClientFile(readResourceBindings(dir));

        expect(before).toContain('this.tempTokens = new TempTokens(this.http);');
        expect(after).not.toContain('TempTokens');
        expect(after).toContain("import { Tags } from './resources/gen_tags';");
    });

    it('wires a new resource in property order', () => {
        const dir = dirWith({ 'gen_tags.ts': resourceSource('Tags'), 'gen_meta.ts': resourceSource('Meta'), 'gen_enums.ts': 'export const A = [] as const;\n' });
        const bindings = readResourceBindings(dir);
        const client = emitClientFile(bindings);

        expect(bindings.map((b: ResourceBinding) => b.property)).toEqual(['meta', 'tags']);
        expect(client).toContain("import { Meta } from './resources/gen_meta';");
        expect(client).toContain('    readonly meta: Meta;');
        expect(client).toContain('        this.meta = new Meta(this.http);');
        expect(client.indexOf('readonly meta')).toBeLessThan(client.indexOf('readonly tags'));
    });
});

describe('readResourceBindings', () => {
    it('fails fast on a resource file without exactly one Resource class', () => {
        const dir = dirWith({ 'gen_broken.ts': 'export const nothing = 1;\n' });
        expect(() => readResourceBindings(dir)).toThrow('gen_broken.ts must export exactly one Resource subclass (found 0)');
    });
});

describe('promoteResources', () => {
    it('replaces the client together with the resources', () => {
        const staging = dirWith({ 'gen_meta.ts': resourceSource('Meta') });
        fs.writeFileSync(path.join(staging, CLIENT_FILE), emitClientFile(readResourceBindings(staging)));
        const live = dirWith({ 'gen_tempTokens.ts': resourceSource('TempTokens') });
        const clientPath = path.join(dirWith({}), CLIENT_FILE);
        fs.writeFileSync(clientPath, emitClientFile(readResourceBindings(live)));

        const result = promoteResources(staging, live, clientPath);

        expect(result).toEqual({ copied: ['gen_meta.ts'], removed: ['gen_tempTokens.ts'], clientUpdated: true });
        expect(fs.readFileSync(clientPath, 'utf8')).toContain('this.meta = new Meta(this.http);');
        expect(fs.readFileSync(clientPath, 'utf8')).not.toContain('TempTokens');
    });
});
