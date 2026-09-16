import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, it, expect } from 'vitest';

import { classify, diffResources, emptyDiff, isCompatibleExtension, parseEnumValues, readPublishedMethodNames, ResourceDiff } from './diff';
import type { GuardResult } from './guard';

const GUARDS_OK: GuardResult = { ok: true, anomaly: false, reasons: [], parseOk: true, uploads: 7 };

const temporaryDirs: string[] = [];

/** Create a scratch directory holding the given files, removed after each test. */
function dirWith(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hablla-diff-'));
    temporaryDirs.push(dir);
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
    return dir;
}

/** A generated resource file with one method per `[VERB /path, declaration]` pair. */
function resource(className: string, methods: Array<[string, string]>): string {
    const body = methods.map(([endpoint, declaration]) => `    /**\n     * Doc.\n     * @method ${endpoint}\n     */\n    ${declaration} {\n        return this.http.get('/x', {});\n    }`).join('\n\n');
    return `import { Resource } from './base';\n\nexport class ${className} extends Resource {\n${body}\n}\n`;
}

/** A `gen_enums.ts` source with the given enums. */
function enums(values: Record<string, string[]>): string {
    return Object.entries(values)
        .map(([name, codes]) => `export const ${name} = [\n${codes.map((code) => `    { code: '${code}' },`).join('\n')}\n] as const;\nexport type ${name}Code = (typeof ${name})[number]['code'];`)
        .join('\n\n');
}

const LIST_TAGS = "listTags(opts: { query?: { name?: string } & Record<string, unknown> } = {}): Promise<Paged<Tag>>";

afterEach(() => {
    for (const dir of temporaryDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('isCompatibleExtension', () => {
    it('accepts a new optional query key', () => {
        const after = "listTags(opts: { query?: { start_date?: string; name?: string } & Record<string, unknown> } = {}): Promise<Paged<Tag>>";
        expect(isCompatibleExtension(LIST_TAGS, after)).toBe(true);
    });

    it('accepts typing a previously undocumented query', () => {
        const before = 'getTag(id: string, opts: { query?: Record<string, unknown> } = {}): Promise<Tag>';
        const after = 'getTag(id: string, opts: { query?: { populate?: string[] } & Record<string, unknown> } = {}): Promise<Tag>';
        expect(isCompatibleExtension(before, after)).toBe(true);
    });

    it.each([
        ['a removed query key', "listTags(opts: { query?: Record<string, unknown> } = {}): Promise<Paged<Tag>>"],
        ['a retyped query key', "listTags(opts: { query?: { name?: string[] } & Record<string, unknown> } = {}): Promise<Paged<Tag>>"],
        ['a renamed method', "listAllTags(opts: { query?: { name?: string } & Record<string, unknown> } = {}): Promise<Paged<Tag>>"],
        ['a changed return type', "listTags(opts: { query?: { name?: string } & Record<string, unknown> } = {}): Promise<unknown>"],
        ['a new positional argument', "listTags(sector: string, opts: { query?: { name?: string } & Record<string, unknown> } = {}): Promise<Paged<Tag>>"],
        ['an unparseable declaration', 'listTags(): Promise<Paged<Tag>>'],
    ])('rejects %s', (_label, after) => {
        expect(isCompatibleExtension(LIST_TAGS, after)).toBe(false);
    });
});

describe('diffResources + classify', () => {
    it('is noop for identical trees', () => {
        const files = { 'gen_tags.ts': resource('Tags', [['GET /v1/tags', LIST_TAGS]]), 'gen_enums.ts': enums({ TagType: ['a', 'b'] }) };
        const diff = diffResources(dirWith(files), dirWith(files));
        expect(diff).toEqual(emptyDiff());
        expect(classify(GUARDS_OK, diff)).toBe('noop');
    });

    it('classifies an enum-only change as changed, never noop', () => {
        const current = dirWith({ 'gen_enums.ts': enums({ ConnectionChannel: ['whatsapp', 'email'] }) });
        const staged = dirWith({ 'gen_enums.ts': enums({ ConnectionChannel: ['whatsapp', 'whatsapp_coex', 'email'] }) });
        const diff = diffResources(staged, current);
        expect(diff.changedFiles).toEqual(['gen_enums.ts']);
        expect(classify(GUARDS_OK, diff)).toBe('changed');
    });

    it('classifies a vanished enum as breaking', () => {
        const current = dirWith({ 'gen_enums.ts': enums({ ConnectionChannel: ['whatsapp', 'email'] }) });
        const staged = dirWith({ 'gen_enums.ts': enums({ ConnectionTypeConnection: ['whatsapp', 'email'] }) });
        const diff = diffResources(staged, current);
        expect(diff.removedExports).toEqual(['gen_enums.ts#ConnectionChannel', 'gen_enums.ts#ConnectionChannelCode']);
        expect(classify(GUARDS_OK, diff)).toBe('breaking');
    });

    it('classifies a removed enum value as breaking', () => {
        const current = dirWith({ 'gen_enums.ts': enums({ TaskStatus: ['open', 'done'] }) });
        const staged = dirWith({ 'gen_enums.ts': enums({ TaskStatus: ['open'] }) });
        const diff = diffResources(staged, current);
        expect(diff.removedEnumValues).toEqual(['TaskStatus.done']);
        expect(classify(GUARDS_OK, diff)).toBe('breaking');
    });

    it('classifies a new optional query key as additive', () => {
        const extended = "listTags(opts: { query?: { start_date?: string; name?: string } & Record<string, unknown> } = {}): Promise<Paged<Tag>>";
        const diff = diffResources(dirWith({ 'gen_tags.ts': resource('Tags', [['GET /v1/tags', extended]]) }), dirWith({ 'gen_tags.ts': resource('Tags', [['GET /v1/tags', LIST_TAGS]]) }));
        expect(diff.extendedSignatures.map((s) => s.endpoint)).toEqual(['GET /v1/tags (tags)']);
        expect(diff.changedSignatures).toEqual([]);
        expect(classify(GUARDS_OK, diff)).toBe('additive');
    });

    it('classifies a removed endpoint as breaking and a new resource file as additive', () => {
        const current = dirWith({ 'gen_tempTokens.ts': resource('TempTokens', [['GET /v1/temp-tokens', 'listTempTokens(opts: { query?: Record<string, unknown> } = {}): Promise<unknown>']]) });
        const staged = dirWith({ 'gen_meta.ts': resource('Meta', [['GET /v1/meta/profile', 'getProfile(opts: { query?: Record<string, unknown> } = {}): Promise<unknown>']]) });
        const diff = diffResources(staged, current);
        expect(diff.removedEndpoints).toEqual(['GET /v1/temp-tokens (tempTokens)']);
        expect(diff.addedEndpoints).toEqual(['GET /v1/meta/profile (meta)']);
        expect(diff.removedFiles).toEqual(['gen_tempTokens.ts']);
        expect(classify(GUARDS_OK, diff)).toBe('breaking');

        const additive: ResourceDiff = { ...diff, removedEndpoints: [], removedExports: [], removedFiles: [] };
        expect(classify(GUARDS_OK, additive)).toBe('additive');
    });

    it('lets a tripped guard win over any diff', () => {
        expect(classify({ ...GUARDS_OK, ok: false, anomaly: true }, emptyDiff())).toBe('failure');
    });
});

describe('readPublishedMethodNames', () => {
    it('keeps the same route apart when two resources expose it', () => {
        const dir = dirWith({
            'gen_root.ts': resource('Root', [['GET /v1/workspaces', 'getWorkspaces(opts: { query?: Record<string, unknown> } = {}): Promise<unknown>']]),
            'gen_workspaces.ts': resource('Workspaces', [['GET /v1/workspaces', 'listWorkspaces(opts: { query?: Record<string, unknown> } = {}): Promise<unknown>']]),
        });
        const names = readPublishedMethodNames(dir);
        expect(names.get('root')?.get('GET /v1/workspaces')).toBe('getWorkspaces');
        expect(names.get('workspaces')?.get('GET /v1/workspaces')).toBe('listWorkspaces');
    });
});

describe('parseEnumValues', () => {
    it('reads every enum block with its codes in order', () => {
        expect(parseEnumValues(enums({ A: ['x', 'y'], B: ['z'] }))).toEqual(new Map([['A', ['x', 'y']], ['B', ['z']]]));
    });
});
