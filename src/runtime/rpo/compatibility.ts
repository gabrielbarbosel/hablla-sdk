import { parse, type ParserOptions } from '@babel/parser';
import type { Node } from '@babel/types';

/**
 * Static compatibility analysis between the RPO bundles about to be published and
 * the live workspace code (flow code nodes) that consumes `globalThis.hablla`.
 *
 * Both sides are read through a Babel AST, never by text matching: comments and
 * strings mentioning `hablla` are ignored, lexical scopes are honored (a local
 * `hablla` shadows the global), aliases of the global and of its members are
 * followed, and any usage the analysis cannot pin down fails loudly instead of being
 * skipped. Members are addressed as dotted paths relative to the global, down to two
 * levels (`dispatch`, `dispatch.run`).
 */

/** Name of the global the RPO client bundle publishes. */
export const HABLLA_GLOBAL = 'hablla';

/** Free identifiers that denote the host global object. */
const GLOBAL_OBJECT_NAMES: ReadonlySet<string> = new Set(['globalThis', 'global', 'self', 'window']);

/** Deepest member path recorded under the global (`resource.method`). */
const MEMBER_PATH_DEPTH = 2;

/** Upper bound on the superclass chain walked per class, so a cyclic `extends` cannot loop forever. */
const MAX_CLASS_LINEAGE_DEPTH = 32;

/** Equality operators whose operands are only compared, never used as a value. */
const EQUALITY_OPERATORS: ReadonlySet<string> = new Set(['===', '!==', '==', '!=']);

/** Assignment operators that may store their right-hand side into the target. */
const VALUE_STORING_OPERATORS: ReadonlySet<string> = new Set(['=', '||=', '&&=', '??=']);

/** AST keys that hold positions, comments or metadata rather than child nodes. */
const NON_CHILD_KEYS: ReadonlySet<string> = new Set([
    'type', 'start', 'end', 'loc', 'range', 'extra',
    'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens',
]);

/** Parser options for a flow code node: a script body that may `return`/`await` at top level. */
const CODE_NODE_PARSER: ParserOptions = {
    sourceType: 'script',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
};

/** Parser options for a published RPO class body (module-level `await new X().execute()`). */
const BUNDLE_PARSER: ParserOptions = { sourceType: 'module' };

/** One statically known value stored into a binding, with the scope chain its expression is evaluated in. */
interface BindingValue {
    expression: Node;
    chain: ScopeChain;
}

/**
 * One lexical scope: every name it declares → the values ever stored into it
 * (`null` for a value that is not statically known, such as a parameter).
 */
interface Scope {
    bindings: Map<string, (BindingValue | null)[]>;
    /** Whether `this` inside this scope is not the global object (non-arrow functions, class bodies). */
    bindsThis: boolean;
}

type ScopeChain = readonly Scope[];

/**
 * What an expression evaluates to, as far as `globalThis.hablla` is concerned:
 * - `unrelated`: provably neither the global object nor `hablla`;
 * - `unknown`: a value the analysis cannot see (a parameter), unrelated unless mixed with a related one;
 * - `nullish`: `null`/`undefined`, an alternative that cannot carry members;
 * - `globalObject` / `hablla`: the global object, or `hablla` followed by a member path;
 * - `unverifiable`: possibly related, but not pinned down (dynamic key, ambiguous binding).
 */
type Resolution =
    | { kind: 'unrelated' | 'unknown' | 'nullish' | 'globalObject' | 'unverifiable' }
    | { kind: 'hablla'; path: readonly string[] };

type HabllaResolution = Extract<Resolution, { kind: 'hablla' }>;

/** How a node's value is consumed by its parent. */
type Usage = 'value' | 'discarded' | 'presenceTest' | 'memberObject' | 'alias' | 'assignmentTarget' | 'destructured';

/** Statically recovered shape of one class in a bundle. */
interface ClassShape {
    superName: string | null;
    members: Set<string>;
    /** Member name → class instantiated into it (`this.x = new X(...)`). */
    fieldClasses: Map<string, string>;
}

type MemberNode = Extract<Node, { type: 'MemberExpression' | 'OptionalMemberExpression' }>;

type FunctionNode = Extract<
    Node,
    { type: 'FunctionDeclaration' | 'FunctionExpression' | 'ArrowFunctionExpression' | 'ClassMethod' | 'ClassPrivateMethod' | 'ObjectMethod' }
>;

/**
 * Visits one node with its parent, the key it hangs from, the current scope chain and
 * the state its parent returned; returns the state for its children, or `null` to
 * skip them.
 */
type Visitor<T> = (node: Node, parent: Node | null, key: string, chain: ScopeChain, state: T) => T | null;

const UNRELATED: Resolution = { kind: 'unrelated' };
const UNKNOWN: Resolution = { kind: 'unknown' };
const NULLISH: Resolution = { kind: 'nullish' };
const GLOBAL_OBJECT: Resolution = { kind: 'globalObject' };
const UNVERIFIABLE: Resolution = { kind: 'unverifiable' };

/**
 * Parses JavaScript with the given options, naming the source in the error.
 * @throws When the source is not valid JavaScript.
 */
export function parseJavaScript(source: string, options: ParserOptions, label: string): Node {
    try {
        return parse(source, options);
    } catch (err) {
        throw new Error(`${label} is not valid JavaScript: ${(err as Error).message}`);
    }
}

function isNode(value: unknown): value is Node {
    return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

function isFunctionNode(node: Node): node is FunctionNode {
    return (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'ClassMethod' ||
        node.type === 'ClassPrivateMethod' ||
        node.type === 'ObjectMethod'
    );
}

function isMemberNode(node: Node): node is MemberNode {
    return node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression';
}

function isPattern(node: Node): boolean {
    return node.type === 'ObjectPattern' || node.type === 'ArrayPattern';
}

/** Keys of `node` that are binding, label or name positions, not expressions to analyze. */
function nonExpressionKeys(node: Node): ReadonlySet<string> {
    switch (node.type) {
        case 'VariableDeclarator':
        case 'ClassDeclaration':
        case 'ClassExpression':
        case 'PrivateName':
            return new Set(['id']);
        case 'CatchClause':
            return new Set(['param']);
        case 'LabeledStatement':
        case 'BreakStatement':
        case 'ContinueStatement':
            return new Set(['label']);
        case 'MetaProperty':
            return new Set(['meta', 'property']);
        case 'MemberExpression':
        case 'OptionalMemberExpression':
            return node.computed ? new Set() : new Set(['property']);
        case 'ObjectProperty':
        case 'ClassProperty':
        case 'ClassAccessorProperty':
            return node.computed ? new Set() : new Set(['key']);
        default:
            if (isFunctionNode(node)) {
                const keys = new Set(['id', 'params']);
                if (!('computed' in node) || !node.computed) keys.add('key');
                return keys;
            }
            return new Set();
    }
}

/** The direct children of `node` with the key each hangs from, skipping metadata and binding positions. */
function childEntries(node: Node): [string, Node][] {
    const skip = nonExpressionKeys(node);
    const children: [string, Node][] = [];
    for (const [key, value] of Object.entries(node)) {
        if (NON_CHILD_KEYS.has(key) || skip.has(key)) continue;
        if (Array.isArray(value)) value.filter(isNode).forEach((child) => children.push([key, child]));
        else if (isNode(value)) children.push([key, value]);
    }
    return children;
}

/** Names bound by a binding pattern (`a`, `{ a, b: [c] }`, `...rest`, `a = 1`). */
function patternNames(pattern: Node): string[] {
    switch (pattern.type) {
        case 'Identifier':
            return [pattern.name];
        case 'ObjectPattern':
            return pattern.properties.flatMap((p) => patternNames(p.type === 'RestElement' ? p : p.value));
        case 'ArrayPattern':
            return pattern.elements.flatMap((e) => (e ? patternNames(e) : []));
        case 'RestElement':
            return patternNames(pattern.argument);
        case 'AssignmentPattern':
            return patternNames(pattern.left);
        default:
            return [];
    }
}

/** Whether `node` introduces a lexical scope (a function body block belongs to its function). */
function opensScope(node: Node, parent: Node | null): boolean {
    switch (node.type) {
        case 'Program':
        case 'CatchClause':
        case 'ForStatement':
        case 'ForInStatement':
        case 'ForOfStatement':
        case 'SwitchStatement':
        case 'StaticBlock':
        case 'ClassBody':
            return true;
        case 'BlockStatement':
            return !(parent && isFunctionNode(parent));
        default:
            return isFunctionNode(node);
    }
}

/** Names declared by `let`/`const`/`function`/`class` statements directly in a statement list. */
function lexicalNames(statements: readonly Node[]): string[] {
    return statements.flatMap((statement) => {
        if (statement.type === 'VariableDeclaration' && statement.kind !== 'var') return statement.declarations.flatMap((d) => patternNames(d.id));
        if ((statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') && statement.id) return [statement.id.name];
        return [];
    });
}

/** Names declared by `var` anywhere under `root`, without entering nested functions. */
function hoistedVarNames(root: Node): string[] {
    const names: string[] = [];
    (function collect(node: Node): void {
        if (node !== root && isFunctionNode(node)) return;
        if (node.type === 'VariableDeclaration' && node.kind === 'var') names.push(...node.declarations.flatMap((d) => patternNames(d.id)));
        childEntries(node).forEach(([, child]) => collect(child));
    })(root);
    return names;
}

/** Every name a scope-opening node declares. */
function declaredNames(node: Node): string[] {
    if (isFunctionNode(node)) {
        const ownName = node.type === 'FunctionExpression' && node.id ? [node.id.name] : [];
        const bodyStatements = node.body.type === 'BlockStatement' ? node.body.body : [];
        return [...ownName, ...node.params.flatMap(patternNames), ...hoistedVarNames(node), ...lexicalNames(bodyStatements)];
    }
    switch (node.type) {
        case 'Program':
            return [...hoistedVarNames(node), ...lexicalNames(node.body)];
        case 'BlockStatement':
        case 'StaticBlock':
            return lexicalNames(node.body);
        case 'SwitchStatement':
            return lexicalNames(node.cases.flatMap((switchCase) => switchCase.consequent));
        case 'CatchClause':
            return node.param ? patternNames(node.param) : [];
        case 'ForStatement':
            return node.init?.type === 'VariableDeclaration' && node.init.kind !== 'var' ? lexicalNames([node.init]) : [];
        case 'ForInStatement':
        case 'ForOfStatement':
            return node.left.type === 'VariableDeclaration' && node.left.kind !== 'var' ? lexicalNames([node.left]) : [];
        default:
            return [];
    }
}

function createScope(node: Node): Scope {
    return {
        bindings: new Map(declaredNames(node).map((name) => [name, []])),
        bindsThis: node.type === 'ClassBody' || (isFunctionNode(node) && node.type !== 'ArrowFunctionExpression'),
    };
}

/** The value list of the innermost binding of `name`, or `undefined` when it is a free (global) identifier. */
function findBinding(chain: ScopeChain, name: string): (BindingValue | null)[] | undefined {
    for (let i = chain.length - 1; i >= 0; i--) {
        const values = chain[i]!.bindings.get(name);
        if (values) return values;
    }
    return undefined;
}

/** Walks the AST depth-first, pushing the scope `scopeOf` assigns to each scope-opening node. */
function walk<T>(root: Node, scopeOf: (node: Node, parent: Node | null) => Scope | undefined, visit: Visitor<T>, initial: T): void {
    const chain: Scope[] = [];
    (function step(node: Node, parent: Node | null, key: string, state: T): void {
        const scope = scopeOf(node, parent);
        if (scope) chain.push(scope);
        const childState = visit(node, parent, key, chain, state);
        if (childState !== null) childEntries(node).forEach(([childKey, child]) => step(child, node, childKey, childState));
        if (scope) chain.pop();
    })(root, null, '', initial);
}

/** Records every value stored into a binding of the current chain (unknown values as `null`). */
function recordBindingValues(node: Node, chain: ScopeChain): void {
    const store = (name: string, expression: Node | null): void => {
        findBinding(chain, name)?.push(expression ? { expression, chain: [...chain] } : null);
    };
    const storeUnknown = (target: Node): void => patternNames(target).forEach((name) => store(name, null));

    if (isFunctionNode(node)) {
        node.params.forEach(storeUnknown);
        if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') && node.id) store(node.id.name, null);
    } else if (node.type === 'ClassDeclaration' && node.id) {
        store(node.id.name, null);
    } else if (node.type === 'CatchClause' && node.param) {
        storeUnknown(node.param);
    } else if (node.type === 'VariableDeclarator') {
        if (node.id.type === 'Identifier') {
            if (node.init) store(node.id.name, node.init);
        } else {
            storeUnknown(node.id);
        }
    } else if (node.type === 'AssignmentExpression') {
        if (node.left.type === 'Identifier') store(node.left.name, VALUE_STORING_OPERATORS.has(node.operator) ? node.right : null);
        else if (isPattern(node.left)) storeUnknown(node.left);
    } else if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier') {
        store(node.argument.name, null);
    } else if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
        const targets = node.left.type === 'VariableDeclaration' ? node.left.declarations.map((d) => d.id) : [node.left];
        targets.forEach(storeUnknown);
    }
}

/**
 * Builds every scope of a program with the values stored into its bindings, so that a
 * later walk can resolve any identifier, wherever the assignment to it happens.
 */
function analyzeScopes(program: Node): ReadonlyMap<Node, Scope> {
    const scopes = new Map<Node, Scope>();
    walk<null | true>(
        program,
        (node, parent) => {
            if (!opensScope(node, parent)) return undefined;
            const scope = createScope(node);
            scopes.set(node, scope);
            return scope;
        },
        (node, _parent, _key, chain) => {
            recordBindingValues(node, chain);
            return true;
        },
        true,
    );
    return scopes;
}

/** The statically known name a member expression reads (`a.b`, `a["b"]`, ``a[`b`]``), or `null`. */
function propertyName(member: MemberNode): string | null {
    const property = member.property;
    if (!member.computed) return property.type === 'Identifier' ? property.name : null;
    if (property.type === 'StringLiteral') return property.value;
    if (property.type === 'TemplateLiteral' && property.expressions.length === 0) return property.quasis[0]?.value.cooked ?? null;
    return null;
}

function isRelated(resolution: Resolution): boolean {
    return resolution.kind === 'globalObject' || resolution.kind === 'hablla' || resolution.kind === 'unverifiable';
}

function sameTarget(a: Resolution, b: Resolution): boolean {
    if (a.kind === 'hablla' && b.kind === 'hablla') return a.path.join('.') === b.path.join('.');
    return a.kind === b.kind;
}

/**
 * Merges the possible values of one expression: a single related target when every
 * alternative agrees on it, `unverifiable` when related and other values are mixed.
 */
function combine(alternatives: readonly Resolution[]): Resolution {
    const candidates = alternatives.filter((resolution) => resolution.kind !== 'nullish');
    const related = candidates.filter(isRelated);
    if (related.length === 0) return UNRELATED;
    const [first] = related;
    return candidates.every((candidate) => sameTarget(candidate, first!)) ? first! : UNVERIFIABLE;
}

/**
 * Resolves what an expression evaluates to with respect to the global object and
 * `hablla`, following bindings through the scope chain each value was written in.
 * @param resolving Binding values currently being resolved, so a cyclic alias reads as unknown.
 */
function resolve(expression: Node, chain: ScopeChain, resolving: Set<Node> = new Set()): Resolution {
    switch (expression.type) {
        case 'Identifier':
            return resolveIdentifier(expression.name, chain, resolving);
        case 'ThisExpression':
            return chain.some((scope) => scope.bindsThis) ? UNKNOWN : GLOBAL_OBJECT;
        case 'MemberExpression':
        case 'OptionalMemberExpression':
            return resolveMember(expression, chain, resolving);
        case 'ConditionalExpression':
            return combine([resolve(expression.consequent, chain, resolving), resolve(expression.alternate, chain, resolving)]);
        case 'LogicalExpression':
            return expression.operator === '&&'
                ? resolve(expression.right, chain, resolving)
                : combine([resolve(expression.left, chain, resolving), resolve(expression.right, chain, resolving)]);
        case 'AssignmentExpression':
            return expression.operator === '=' ? resolve(expression.right, chain, resolving) : UNRELATED;
        case 'SequenceExpression':
            return resolve(expression.expressions[expression.expressions.length - 1]!, chain, resolving);
        case 'NullLiteral':
            return NULLISH;
        case 'UnaryExpression':
            return expression.operator === 'void' ? NULLISH : UNRELATED;
        default:
            return UNRELATED;
    }
}

function resolveIdentifier(name: string, chain: ScopeChain, resolving: Set<Node>): Resolution {
    const values = findBinding(chain, name);
    if (values === undefined) {
        if (name === HABLLA_GLOBAL) return { kind: 'hablla', path: [] };
        if (name === 'undefined') return NULLISH;
        return GLOBAL_OBJECT_NAMES.has(name) ? GLOBAL_OBJECT : UNRELATED;
    }
    return combine(
        values.map((value) => {
            if (!value || resolving.has(value.expression)) return UNKNOWN;
            resolving.add(value.expression);
            const resolution = resolve(value.expression, value.chain, resolving);
            resolving.delete(value.expression);
            return resolution;
        }),
    );
}

function resolveMember(member: MemberNode, chain: ScopeChain, resolving: Set<Node>): Resolution {
    const name = propertyName(member);
    const object = resolve(member.object, chain, resolving);
    if (object.kind === 'unknown' && member.object.type === 'ThisExpression') return name === HABLLA_GLOBAL ? UNVERIFIABLE : UNRELATED;
    if (object.kind === 'unverifiable') return UNVERIFIABLE;
    if (object.kind === 'globalObject') {
        if (name === null) return UNVERIFIABLE;
        return name === HABLLA_GLOBAL ? { kind: 'hablla', path: [] } : UNRELATED;
    }
    if (object.kind === 'hablla') return name === null ? UNVERIFIABLE : { kind: 'hablla', path: [...object.path, name] };
    return UNRELATED;
}

/** How the value of the child at `key` of `parent` is consumed, given how `parent` itself is consumed. */
function usageOf(parent: Node, key: string, parentUsage: Usage): Usage {
    switch (parent.type) {
        case 'MemberExpression':
        case 'OptionalMemberExpression':
            return key === 'object' ? 'memberObject' : 'value';
        case 'VariableDeclarator':
            return parent.id.type === 'Identifier' ? 'alias' : 'destructured';
        case 'AssignmentExpression':
            if (key === 'left') return parent.operator === '=' ? 'assignmentTarget' : 'value';
            if (parent.left.type === 'Identifier') return 'alias';
            return isPattern(parent.left) ? 'destructured' : 'value';
        case 'UnaryExpression':
            return parent.operator === 'typeof' || parent.operator === '!' ? 'presenceTest' : 'value';
        case 'BinaryExpression':
            return EQUALITY_OPERATORS.has(parent.operator) ? 'presenceTest' : 'value';
        case 'LogicalExpression':
            return parent.operator === '&&' && key === 'left' ? 'presenceTest' : parentUsage;
        case 'ConditionalExpression':
            return key === 'test' ? 'presenceTest' : parentUsage;
        case 'ExpressionStatement':
            return 'discarded';
        case 'IfStatement':
        case 'WhileStatement':
        case 'DoWhileStatement':
        case 'ForStatement':
            return key === 'test' ? 'presenceTest' : 'value';
        default:
            return 'value';
    }
}

function truncatedPath(path: readonly string[]): string | null {
    return path.length === 0 ? null : path.slice(0, MEMBER_PATH_DEPTH).join('.');
}

/**
 * Extracts every member of `globalThis.hablla` a piece of live code (e.g. a flow code
 * node) reads, as sorted, de-duplicated dotted paths up to two levels deep
 * (`hablla.dispatch.run(...)` → `dispatch.run`). Accepts top-level `return`/`await`.
 *
 * Followed: the global object (`globalThis`, `global`, `self`, `window`, top-level
 * `this`, literal keys such as `globalThis["hablla"]`), aliases of the global and of its
 * members (`const p = hablla.persons; p.list()`), and optional chaining. Ignored: local
 * bindings that shadow `hablla`, presence tests on it (`typeof`, `!`, `&&`, `===`,
 * conditions), and the member written by an assignment (`hablla.x = …` needs nothing,
 * `hablla.a.b = …` needs `a`).
 * @param source The JavaScript source to analyze.
 * @returns The referenced member paths.
 * @throws When the source does not parse, or uses the global in a way that cannot be
 *   verified statically (dynamic key, destructuring, an ambiguous binding, passing it around).
 */
export function extractHabllaReferences(source: string): string[] {
    const program = parseJavaScript(source, CODE_NODE_PARSER, 'Live code');
    const scopes = analyzeScopes(program);
    const paths = new Set<string>();
    const record = (path: string | null): void => {
        if (path) paths.add(path);
    };

    walk<Usage>(
        program,
        (node) => scopes.get(node),
        (node, parent, key, chain, parentUsage) => {
            const usage = parent ? usageOf(parent, key, parentUsage) : 'value';
            if (usage === 'memberObject' || usage === 'alias') return usage;
            if (usage === 'assignmentTarget' && !isMemberNode(node)) return null;

            const resolution = resolve(node, chain);
            if (!isRelated(resolution) || usage === 'presenceTest' || usage === 'discarded') return usage;
            if (usage === 'destructured' || resolution.kind !== 'hablla') throw unverifiableUsage(node);
            const { path } = resolution as HabllaResolution;
            if (usage === 'assignmentTarget') record(truncatedPath(path.slice(0, -1)));
            else if (path.length === 0) throw unverifiableUsage(node);
            else record(truncatedPath(path));
            return usage;
        },
        'value',
    );

    return [...paths].sort();
}

function unverifiableUsage(node: Node): Error {
    const line = node.loc?.start.line ?? '?';
    return new Error(
        `Live code uses globalThis.${HABLLA_GLOBAL} in a way that cannot be verified statically (line ${line}); ` +
            `access its members directly, e.g. ${HABLLA_GLOBAL}.resource.method(...)`,
    );
}

/** Every class in a bundle (`class X {}` or `var X = class {}`), keyed by name. */
function collectClasses(program: Node): Map<string, ClassShape> {
    const classes = new Map<string, ClassShape>();
    (function collect(node: Node): void {
        if (node.type === 'ClassDeclaration' && node.id) classes.set(node.id.name, shapeOf(node));
        if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init?.type === 'ClassExpression') {
            classes.set(node.id.name, shapeOf(node.init));
        }
        childEntries(node).forEach(([, child]) => collect(child));
    })(program);
    return classes;
}

function instantiatedClass(expression: Node | null | undefined): string | null {
    return expression?.type === 'NewExpression' && expression.callee.type === 'Identifier' ? expression.callee.name : null;
}

/** The instance members of one class: fields, methods/accessors, and `this.x = …` assignments in its constructor. */
function shapeOf(node: Extract<Node, { type: 'ClassDeclaration' | 'ClassExpression' }>): ClassShape {
    const shape: ClassShape = {
        superName: node.superClass?.type === 'Identifier' ? node.superClass.name : null,
        members: new Set(),
        fieldClasses: new Map(),
    };
    for (const element of node.body.body) {
        if (element.type !== 'ClassProperty' && element.type !== 'ClassMethod') continue;
        if (element.static || element.computed || element.key.type !== 'Identifier') continue;
        if (element.type === 'ClassMethod' && element.kind === 'constructor') {
            collectThisAssignments(element.body, shape);
            continue;
        }
        shape.members.add(element.key.name);
        const fieldClass = element.type === 'ClassProperty' ? instantiatedClass(element.value) : null;
        if (fieldClass) shape.fieldClasses.set(element.key.name, fieldClass);
    }
    return shape;
}

function collectThisAssignments(body: Node, shape: ClassShape): void {
    (function collect(node: Node): void {
        if (node !== body && isFunctionNode(node) && node.type !== 'ArrowFunctionExpression') return;
        if (node.type === 'AssignmentExpression' && isMemberNode(node.left) && node.left.object.type === 'ThisExpression') {
            const name = propertyName(node.left);
            if (name) {
                shape.members.add(name);
                const fieldClass = instantiatedClass(node.right);
                if (fieldClass) shape.fieldClasses.set(name, fieldClass);
            }
        }
        childEntries(node).forEach(([, child]) => collect(child));
    })(body);
}

/** Resolves `name` up the superclass chain of a bundle's classes. */
function classLineage(classes: ReadonlyMap<string, ClassShape>, name: string): ClassShape[] {
    const lineage: ClassShape[] = [];
    for (
        let current = classes.get(name);
        current && lineage.length < MAX_CLASS_LINEAGE_DEPTH;
        current = current.superName ? classes.get(current.superName) : undefined
    ) {
        lineage.push(current);
    }
    return lineage;
}

function membersOf(classes: ReadonlyMap<string, ClassShape>, name: string): string[] {
    return [...new Set(classLineage(classes, name).flatMap((shape) => [...shape.members]))];
}

function fieldClassOf(classes: ReadonlyMap<string, ClassShape>, name: string, member: string): string | null {
    return classLineage(classes, name).find((shape) => shape.fieldClasses.has(member))?.fieldClasses.get(member) ?? null;
}

/**
 * The class an expression evaluates to an instance of, when statically known.
 * @param resolving Binding values currently being resolved, so a cyclic alias reads as unknown.
 */
function classOfExpression(classes: ReadonlyMap<string, ClassShape>, chain: ScopeChain, expression: Node, resolving: Set<Node> = new Set()): string | null {
    const direct = instantiatedClass(expression);
    if (direct) return classes.has(direct) ? direct : null;
    if (expression.type === 'Identifier') {
        const values = findBinding(chain, expression.name);
        const value = values?.length === 1 ? values[0] : null;
        if (!value || resolving.has(value.expression)) return null;
        resolving.add(value.expression);
        return classOfExpression(classes, value.chain, value.expression, resolving);
    }
    if (isMemberNode(expression)) {
        const owner = classOfExpression(classes, chain, expression.object, resolving);
        const member = propertyName(expression);
        return owner && member ? fieldClassOf(classes, owner, member) : null;
    }
    return null;
}

/** Member paths exposed by an instance of `className` mounted at `prefix` (`''` for the global itself). */
function instancePaths(classes: ReadonlyMap<string, ClassShape>, className: string, prefix: string): string[] {
    const qualify = (member: string): string => (prefix ? `${prefix}.${member}` : member);
    if (prefix) return membersOf(classes, className).map(qualify);
    return membersOf(classes, className).flatMap((member) => {
        const fieldClass = fieldClassOf(classes, className, member);
        return [member, ...(fieldClass ? instancePaths(classes, fieldClass, member) : [])];
    });
}

function isHabllaAt(resolution: Resolution, depth: number): boolean {
    return resolution.kind === 'hablla' && resolution.path.length === depth;
}

/**
 * Lists the member paths of `globalThis.hablla` that a set of RPO bundles exposes once
 * they all run: the members of the instance assigned to the global (two levels deep)
 * plus any member attached to it afterwards (a compatibility facade).
 * @param bundles The class bodies, keyed by class name.
 * @returns The sorted, de-duplicated member paths.
 * @throws When a bundle does not parse, when no bundle publishes the global, or when
 *   the instance assigned to it cannot be resolved to a class.
 */
export function listHabllaSurface(bundles: Readonly<Record<string, string>>): string[] {
    const paths = new Set<string>();
    let published = false;

    for (const [name, source] of Object.entries(bundles)) {
        const program = parseJavaScript(source, BUNDLE_PARSER, name);
        const classes = collectClasses(program);
        const scopes = analyzeScopes(program);
        walk<true>(
            program,
            (node) => scopes.get(node),
            (node, _parent, _key, chain) => {
                if (node.type !== 'AssignmentExpression' || node.operator !== '=' || !isMemberNode(node.left)) return true;
                if (isHabllaAt(resolve(node.left, chain), 0)) {
                    const rootClass = classOfExpression(classes, chain, node.right);
                    if (!rootClass) throw new Error(`${name} assigns globalThis.${HABLLA_GLOBAL} a value whose class cannot be resolved`);
                    instancePaths(classes, rootClass, '').forEach((path) => paths.add(path));
                    published = true;
                    return true;
                }
                const member = propertyName(node.left);
                if (member && isHabllaAt(resolve(node.left.object, chain), 0)) {
                    paths.add(member);
                    const attachedClass = classOfExpression(classes, chain, node.right);
                    if (attachedClass) instancePaths(classes, attachedClass, member).forEach((path) => paths.add(path));
                }
                return true;
            },
            true,
        );
    }

    if (!published) throw new Error(`No bundle publishes globalThis.${HABLLA_GLOBAL}`);
    return [...paths].sort();
}

/**
 * The required member paths the surface does not expose.
 * @param required Paths the live code uses (see {@link extractHabllaReferences}).
 * @param surface Paths the bundles expose (see {@link listHabllaSurface}).
 */
export function findMissingMembers(required: readonly string[], surface: readonly string[]): string[] {
    const exposed = new Set(surface);
    return [...new Set(required)].filter((path) => !exposed.has(path)).sort();
}

/** Outcome of comparing the published runtime with the one about to replace it, against live code. */
export interface SurfaceRegression {
    /** Live members the published runtime exposes and the next one drops: a deploy must be refused. */
    dropped: string[];
    /** Live members already missing from the published runtime and still missing from the next: a warning, not a blocker. */
    alreadyMissing: string[];
}

/**
 * Compares two runtimes against the live code in regression mode: only what the next
 * runtime breaks blocks, while references already broken today are reported apart.
 * @param required Paths the live code uses (see {@link extractHabllaReferences}).
 * @param publishedSurface Paths the currently published bundles expose (see {@link listHabllaSurface}).
 * @param nextSurface Paths the bundles about to be deployed expose.
 */
export function findSurfaceRegression(
    required: readonly string[],
    publishedSurface: readonly string[],
    nextSurface: readonly string[],
): SurfaceRegression {
    const missingFromNext = findMissingMembers(required, nextSurface);
    const published = new Set(publishedSurface);
    return {
        dropped: missingFromNext.filter((path) => published.has(path)),
        alreadyMissing: missingFromNext.filter((path) => !published.has(path)),
    };
}
