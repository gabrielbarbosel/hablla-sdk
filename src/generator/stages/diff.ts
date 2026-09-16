/**
 * Generator stage: DIFF + CLASSIFY.
 *
 * Compares the freshly emitted `_staging` resource files against the live
 * `src/sdk/resources` and reduces the delta to the {@link ResourceDiff} the
 * release driver (`scripts/release.mjs`), the change summary and the report
 * consume.
 *
 * An "endpoint" is the `VERB /path` a method is annotated with (`@method GET
 * /v2/...`) qualified by the resource that exposes it (the same route may live on
 * two classes), and its "signature" is the emitted method declaration line
 * (`name(args): Promise<T>`). Besides endpoints, the diff tracks every exported
 * symbol, every enum value and every exported interface member (parsed through
 * the AST), so a change that only touches `gen_enums.ts` or an interface is never
 * lost. Everything is read straight out of the `.ts` source — no TypeScript
 * program needed — so the diff is a pure function of the two file
 * trees and re-running on the same trees yields the same result.
 */

import * as fs from 'fs';
import * as path from 'path';

import { parse } from '@babel/parser';
import type { Node, TSTypeElement } from '@babel/types';

import { GuardResult } from './guard';

/** One method's identity: its `VERB /path` key and its declaration signature. */
export interface EndpointSignature {
    /** `VERB /path`, e.g. `GET /v2/workspaces/{workspace_id}/cards`. */
    key: string;
    /** The emitted declaration line, e.g. `listCards(opts: {...}): Promise<Paged<Card>>`. */
    signature: string;
}

/** A signature that differs between the current tree and the staged tree. */
export interface ChangedSignature {
    endpoint: string;
    before: string;
    after: string;
}

/** An interface member whose declaration differs between the current tree and the staged tree. */
export interface ChangedMember {
    /** `file#Interface.member`. */
    member: string;
    before: string;
    after: string;
}

/** The public-surface delta between two resource trees. */
export interface ResourceDiff {
    /** Endpoints (`VERB /path (resource)`) only present in the staged tree. */
    addedEndpoints: string[];
    /** Endpoints only present in the current tree. */
    removedEndpoints: string[];
    /** Signatures changed incompatibly (renamed, argument or return type changed, query key removed or retyped). */
    changedSignatures: ChangedSignature[];
    /** Signatures that only gained optional query keys; existing calls keep compiling. */
    extendedSignatures: ChangedSignature[];
    /** Exported symbols (`file#Name`) that vanished. */
    removedExports: string[];
    /** Enum values (`Enum.value`) that vanished from an enum that still exists. */
    removedEnumValues: string[];
    /** Members (`file#Interface.member`) that vanished from an exported interface that still exists. */
    removedMembers: string[];
    /** Members whose declaration changed: type, optionality or modifiers. */
    retypedMembers: ChangedMember[];
    addedFiles: string[];
    removedFiles: string[];
    /** Files present in both trees whose content differs. */
    changedFiles: string[];
}

/** A diff with no change at all, for reports written before a diff could be computed. */
export function emptyDiff(): ResourceDiff {
    return { addedEndpoints: [], removedEndpoints: [], changedSignatures: [], extendedSignatures: [], removedExports: [], removedEnumValues: [], removedMembers: [], retypedMembers: [], addedFiles: [], removedFiles: [], changedFiles: [] };
}

/** The release classifications, in descending severity. */
export type Classification = 'failure' | 'breaking' | 'additive' | 'changed' | 'noop';

/**
 * Parse every `@method VERB /path` annotation in a resource file and pair it
 * with the method declaration line that follows its JSDoc block.
 * @param source The `.ts` source of one resource file.
 * @returns One entry per annotated method (endpoint key + signature).
 */
export function parseEndpointSignatures(source: string): EndpointSignature[] {
    const lines = source.split(/\r?\n/);
    const out: EndpointSignature[] = [];
    for (let i = 0; i < lines.length; i++) {
        const tag = /@method\s+(\w+)\s+(\S+)/.exec(lines[i]!);
        if (!tag) continue;
        const key = `${tag[1]!.toUpperCase()} ${tag[2]}`;
        let signature = '';
        for (let j = i + 1; j < lines.length; j++) {
            const trimmed = lines[j]!.trim();
            if (trimmed === '' || trimmed.startsWith('*') || trimmed.startsWith('/**')) continue;
            const decl = /^([A-Za-z0-9_]+)\s*\(.*\)\s*:\s*Promise<.*>/.exec(trimmed);
            if (decl) signature = trimmed.replace(/\s*\{?\s*$/, '');
            break;
        }
        out.push({ key, signature });
    }
    return out;
}

/** List the `gen_*.ts` basenames present in a directory (empty if absent). */
function listGenFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.startsWith('gen_') && f.endsWith('.ts')).sort();
}

/** The resource key of a generated file, e.g. `gen_cards.ts` -> `cards`. */
function resourceOf(file: string): string {
    return file.slice('gen_'.length, -'.ts'.length);
}

/** Read a file with line endings normalized, so CRLF vs LF is never a diff. */
function readNormalized(dir: string, file: string): string {
    return fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n');
}

/** Map `VERB /path (resource)` -> signature across every `gen_*.ts` in a tree. */
function endpointMap(dir: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const file of listGenFiles(dir)) {
        for (const { key, signature } of parseEndpointSignatures(readNormalized(dir, file))) {
            map.set(`${key} (${resourceOf(file)})`, signature);
        }
    }
    return map;
}

/**
 * Read the method name each endpoint is published under, per resource.
 * @param dir A resources directory (e.g. the live `src/sdk/resources`).
 * @returns resource key -> (`VERB /path` -> method name).
 */
export function readPublishedMethodNames(dir: string): Map<string, Map<string, string>> {
    const byResource = new Map<string, Map<string, string>>();
    for (const file of listGenFiles(dir)) {
        const names = new Map<string, string>();
        for (const { key, signature } of parseEndpointSignatures(readNormalized(dir, file))) {
            const name = /^([A-Za-z0-9_]+)\(/.exec(signature)?.[1];
            if (name) names.set(key, name);
        }
        byResource.set(resourceOf(file), names);
    }
    return byResource;
}

/** Every exported symbol of a tree as `file#Name`. */
function exportedSymbols(dir: string): Set<string> {
    const symbols = new Set<string>();
    for (const file of listGenFiles(dir)) {
        for (const match of readNormalized(dir, file).matchAll(/^export (?:const|interface|type|class|enum|function) (\w+)/gm)) {
            symbols.add(`${file}#${match[1]}`);
        }
    }
    return symbols;
}

/**
 * Parse the `export const Name = [ { code: '…' }, … ] as const;` blocks of a `gen_enums.ts` source.
 * @param source The enums file source.
 * @returns enum name -> its values.
 */
export function parseEnumValues(source: string): Map<string, string[]> {
    const enums = new Map<string, string[]>();
    for (const block of source.matchAll(/^export const (\w+) = \[\n([\s\S]*?)\] as const;/gm)) {
        enums.set(block[1]!, [...block[2]!.matchAll(/code: '([^']*)'/g)].map((value) => value[1]!));
    }
    return enums;
}

/** A declaration's source text with whitespace collapsed and the trailing member separator dropped. */
function declarationText(source: string, node: Node): string {
    return source.slice(node.start!, node.end!).replace(/\s+/g, ' ').replace(/[;,]$/, '').trim();
}

/** The name a member is addressed by: its key, or its whole declaration when it has none (index and call signatures). */
function memberName(source: string, member: TSTypeElement): string {
    if ('key' in member && !member.computed) {
        if (member.key.type === 'Identifier') return member.key.name;
        if (member.key.type === 'StringLiteral') return member.key.value;
    }
    return declarationText(source, member);
}

/**
 * Parse the members of every exported interface of a source file, through the AST.
 * @param source The `.ts` source of one generated file.
 * @returns interface name -> (member name -> its normalized declaration, e.g. `status?: OrganizationStatusCode`).
 */
export function parseInterfaceMembers(source: string): Map<string, Map<string, string>> {
    const interfaces = new Map<string, Map<string, string>>();
    for (const statement of parse(source, { sourceType: 'module', plugins: ['typescript'] }).program.body) {
        if (statement.type !== 'ExportNamedDeclaration' || statement.declaration?.type !== 'TSInterfaceDeclaration') continue;
        const members = new Map<string, string>();
        for (const member of statement.declaration.body.body) members.set(memberName(source, member), declarationText(source, member));
        interfaces.set(statement.declaration.id.name, members);
    }
    return interfaces;
}

/** `file#Interface` -> members across every `gen_*.ts` of a tree. */
function interfaceMembers(dir: string): Map<string, Map<string, string>> {
    const byInterface = new Map<string, Map<string, string>>();
    for (const file of listGenFiles(dir)) {
        for (const [name, members] of parseInterfaceMembers(readNormalized(dir, file))) byInterface.set(`${file}#${name}`, members);
    }
    return byInterface;
}

/** Enum name -> values of a tree's `gen_enums.ts` (empty when absent). */
function enumValues(dir: string): Map<string, string[]> {
    return fs.existsSync(path.join(dir, 'gen_enums.ts')) ? parseEnumValues(readNormalized(dir, 'gen_enums.ts')) : new Map();
}

/** A method declaration split into the parts that decide call-site compatibility. */
interface ParsedSignature {
    name: string;
    positionalArgs: string[];
    /** Documented query keys -> `optional:type`. */
    queryKeys: Map<string, string>;
    returnType: string;
}

/** Split on a separator that is not nested inside brackets. */
function splitTopLevel(text: string, separator: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const char of text) {
        if ('({[<'.includes(char)) depth++;
        if (')}]>'.includes(char)) depth--;
        if (char === separator && depth === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

/** Index of the bracket closing the one opened at `openIndex`, or -1. */
function closingIndex(text: string, openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < text.length; i++) {
        if ('({[<'.includes(text[i]!)) depth++;
        if (')}]>'.includes(text[i]!)) depth--;
        if (depth === 0) return i;
    }
    return -1;
}

/** Parse the typed keys of an `opts` argument; `Record<string, unknown>` documents none. */
function parseQueryKeys(optsArg: string): Map<string, string> | undefined {
    const query = /^opts: \{ query\?: (.*) \} = \{\}$/.exec(optsArg)?.[1];
    if (query === undefined) return undefined;
    if (query === 'Record<string, unknown>') return new Map();
    const shape = /^\{ (.*) \} & Record<string, unknown>$/.exec(query)?.[1];
    if (shape === undefined) return undefined;
    const keys = new Map<string, string>();
    for (const member of splitTopLevel(shape, ';')) {
        const field = /^(\w+)(\??):\s*(.+)$/.exec(member);
        if (!field) return undefined;
        keys.set(field[1]!, `${field[2]}:${field[3]}`);
    }
    return keys;
}

/** Parse an emitted declaration line; `undefined` when it does not follow the emitted shape. */
function parseSignature(signature: string): ParsedSignature | undefined {
    const name = /^(\w+)\(/.exec(signature)?.[1];
    if (!name) return undefined;
    const argsEnd = closingIndex(signature, name.length);
    const returnType = /^\):\s*(.+)$/.exec(signature.slice(argsEnd))?.[1];
    if (argsEnd < 0 || !returnType) return undefined;
    const args = splitTopLevel(signature.slice(name.length + 1, argsEnd), ',');
    const optsArg = args.at(-1);
    const queryKeys = optsArg ? parseQueryKeys(optsArg) : undefined;
    if (!queryKeys) return undefined;
    return { name, positionalArgs: args.slice(0, -1), queryKeys, returnType };
}

/**
 * Whether `after` only adds optional query keys to `before`: same name, same
 * positional arguments, same return type, and every documented key kept with
 * its type. Unparseable signatures are never considered compatible.
 */
export function isCompatibleExtension(before: string, after: string): boolean {
    const a = parseSignature(before);
    const b = parseSignature(after);
    if (!a || !b) return false;
    if (a.name !== b.name || a.returnType !== b.returnType) return false;
    if (a.positionalArgs.join(',') !== b.positionalArgs.join(',')) return false;
    for (const [key, type] of a.queryKeys) {
        if (b.queryKeys.get(key) !== type) return false;
    }
    return [...b.queryKeys].every(([key, type]) => a.queryKeys.has(key) || type.startsWith('?:'));
}

/**
 * Diff the staged resource tree against the current one.
 * @param stagingDir The freshly emitted `_staging` directory.
 * @param currentDir The live `src/sdk/resources` directory.
 * @returns The public-surface delta.
 */
export function diffResources(stagingDir: string, currentDir: string): ResourceDiff {
    const stagingEndpoints = endpointMap(stagingDir);
    const currentEndpoints = endpointMap(currentDir);

    const addedEndpoints: string[] = [];
    const changedSignatures: ChangedSignature[] = [];
    const extendedSignatures: ChangedSignature[] = [];
    for (const [endpoint, after] of stagingEndpoints) {
        const before = currentEndpoints.get(endpoint);
        if (before === undefined) addedEndpoints.push(endpoint);
        else if (before !== after) (isCompatibleExtension(before, after) ? extendedSignatures : changedSignatures).push({ endpoint, before, after });
    }
    const removedEndpoints = [...currentEndpoints.keys()].filter((endpoint) => !stagingEndpoints.has(endpoint));

    const stagingExports = exportedSymbols(stagingDir);
    const removedExports = [...exportedSymbols(currentDir)].filter((symbol) => !stagingExports.has(symbol));

    const stagingEnums = enumValues(stagingDir);
    const removedEnumValues: string[] = [];
    for (const [name, values] of enumValues(currentDir)) {
        const kept = stagingEnums.get(name);
        if (!kept) continue;
        for (const value of values) if (!kept.includes(value)) removedEnumValues.push(`${name}.${value}`);
    }

    const stagingInterfaces = interfaceMembers(stagingDir);
    const removedMembers: string[] = [];
    const retypedMembers: ChangedMember[] = [];
    for (const [owner, members] of interfaceMembers(currentDir)) {
        const kept = stagingInterfaces.get(owner);
        if (!kept) continue;
        for (const [name, before] of members) {
            const after = kept.get(name);
            const member = `${owner}.${name}`;
            if (after === undefined) removedMembers.push(member);
            else if (after !== before) retypedMembers.push({ member, before, after });
        }
    }

    const stagingFiles = listGenFiles(stagingDir);
    const currentFiles = listGenFiles(currentDir);
    const currentSet = new Set(currentFiles);
    const stagingSet = new Set(stagingFiles);

    const bySignatureEndpoint = (x: ChangedSignature, y: ChangedSignature) => (x.endpoint < y.endpoint ? -1 : 1);
    return {
        addedEndpoints: addedEndpoints.sort(),
        removedEndpoints: removedEndpoints.sort(),
        changedSignatures: changedSignatures.sort(bySignatureEndpoint),
        extendedSignatures: extendedSignatures.sort(bySignatureEndpoint),
        removedExports: removedExports.sort(),
        removedEnumValues: removedEnumValues.sort(),
        removedMembers: removedMembers.sort(),
        retypedMembers: retypedMembers.sort((x, y) => (x.member < y.member ? -1 : 1)),
        addedFiles: stagingFiles.filter((file) => !currentSet.has(file)),
        removedFiles: currentFiles.filter((file) => !stagingSet.has(file)),
        changedFiles: stagingFiles.filter((file) => currentSet.has(file) && readNormalized(stagingDir, file) !== readNormalized(currentDir, file)),
    };
}

/**
 * Classify a run from the guard verdict and the diff, first match wins:
 *
 * - `failure`  — a guard tripped; nothing may be promoted.
 * - `breaking` — a consumer's code can stop compiling: an endpoint, exported
 *   symbol, enum value or interface member vanished, an interface member's
 *   declaration changed (type, optionality, modifiers), or a signature changed
 *   incompatibly.
 * - `additive` — new surface only: endpoints, resource files, or optional query
 *   keys on existing signatures.
 * - `changed`  — generated content differs with nothing above (new enum values,
 *   new interface members, docs, type aliases other than the enum-derived ones,
 *   which are not analysed). Never dropped as `noop`: it is released like an
 *   additive change (a patch bump).
 * - `noop`     — the staged tree is identical to the live one.
 * @param guards The guard verdict.
 * @param diff The resource diff.
 */
export function classify(guards: GuardResult, diff: ResourceDiff): Classification {
    if (!guards.ok) return 'failure';
    if (diff.removedEndpoints.length || diff.changedSignatures.length || diff.removedExports.length || diff.removedEnumValues.length || diff.removedMembers.length || diff.retypedMembers.length) return 'breaking';
    if (diff.addedEndpoints.length || diff.addedFiles.length || diff.extendedSignatures.length) return 'additive';
    if (diff.changedFiles.length || diff.removedFiles.length) return 'changed';
    return 'noop';
}

/**
 * The percentage of current endpoints that disappeared in the staged tree.
 * Surfaced as `guards.endpointDropPct` — a durability signal (a big drop is a
 * red flag even when the guards technically pass).
 * @param diff The resource diff.
 * @param currentEndpointCount Total endpoints in the current tree.
 */
export function endpointDropPct(diff: ResourceDiff, currentEndpointCount: number): number {
    if (currentEndpointCount <= 0) return 0;
    return Math.round((diff.removedEndpoints.length / currentEndpointCount) * 1000) / 10;
}

/** Count the endpoints in a resource tree (for {@link endpointDropPct}). */
export function countEndpoints(dir: string): number {
    return endpointMap(dir).size;
}
