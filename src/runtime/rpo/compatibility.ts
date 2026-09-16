import { parse, type ParserOptions } from '@babel/parser';
import type { Expression, Node } from '@babel/types';

/**
 * Static compatibility analysis between the RPO bundles about to be published and
 * the live workspace code (flow code nodes) that consumes `globalThis.hablla`.
 *
 * Both sides are read through a Babel AST, never by text matching: comments and
 * strings mentioning `hablla` are ignored, aliases (`const h = globalThis.hablla`)
 * are followed, and any usage the analysis cannot pin down fails loudly instead of
 * being skipped. Members are addressed as dotted paths relative to the global, down
 * to two levels (`dispatch`, `dispatch.run`).
 */

/** Name of the global the RPO client bundle publishes. */
export const HABLLA_GLOBAL = 'hablla';

/** Identifiers that denote the host global object inside the RPO sandbox. */
const GLOBAL_OBJECT_NAMES: ReadonlySet<string> = new Set(['globalThis', 'global']);

/** Deepest member path recorded under the global (`resource.method`). */
const MEMBER_PATH_DEPTH = 2;

/** Upper bound on identifier-alias hops, so a cyclic alias chain cannot recurse forever. */
const MAX_ALIAS_HOPS = 32;

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

/**
 * Lexical bindings of one function (or the program): name → initializer expression,
 * or `null` when the binding has no statically known value (parameter, pattern,
 * declaration, or a name declared more than once in the same function).
 */
type Scope = ReadonlyMap<string, Expression | null>;

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

/** Keys of `node` that are binding or label positions, not expressions to analyze. */
function nonExpressionKeys(node: Node): ReadonlySet<string> {
    switch (node.type) {
        case 'VariableDeclarator':
            return new Set(['id']);
        case 'CatchClause':
            return new Set(['param']);
        case 'LabeledStatement':
        case 'BreakStatement':
        case 'ContinueStatement':
            return new Set(['label']);
        case 'ClassDeclaration':
        case 'ClassExpression':
            return new Set(['id']);
        case 'MemberExpression':
        case 'OptionalMemberExpression':
            return node.computed ? new Set() : new Set(['property']);
        case 'ObjectProperty':
        case 'ClassProperty':
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

/** The direct child nodes of `node`, skipping metadata and the given keys. */
function childNodes(node: Node, skip: ReadonlySet<string> = new Set()): Node[] {
    const children: Node[] = [];
    for (const [key, value] of Object.entries(node)) {
        if (NON_CHILD_KEYS.has(key) || skip.has(key)) continue;
        if (Array.isArray(value)) children.push(...value.filter(isNode));
        else if (isNode(value)) children.push(value);
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

/**
 * Builds the scope of one function body or program: parameters, `var`/`let`/`const`
 * declarators, and function/class declarations, without entering nested functions.
 * Block scopes are folded into the function; a repeated name becomes ambiguous (`null`).
 */
function buildScope(root: Node, params: readonly Node[]): Scope {
    const scope = new Map<string, Expression | null>();
    const bind = (name: string, init: Expression | null): void => {
        scope.set(name, scope.has(name) ? null : init);
    };
    for (const param of params) patternNames(param).forEach((name) => bind(name, null));

    (function collect(node: Node): void {
        if (node.type === 'VariableDeclarator') {
            if (node.id.type === 'Identifier') bind(node.id.name, node.init ?? null);
            else patternNames(node.id).forEach((name) => bind(name, null));
        } else if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) {
            bind(node.id.name, null);
        }
        if (node !== root && isFunctionNode(node)) return;
        childNodes(node).forEach(collect);
    })(root);
    return scope;
}

/** Innermost binding of `name`, or `undefined` when it is a free (global) identifier. */
function lookup(scopes: readonly Scope[], name: string): Expression | null | undefined {
    for (let i = scopes.length - 1; i >= 0; i--) {
        if (scopes[i]!.has(name)) return scopes[i]!.get(name);
    }
    return undefined;
}

/**
 * Walks the AST keeping the lexical scope stack. `visit` returns the child nodes to
 * descend into (or `null` for the default children), letting callers prune subtrees
 * they fully handled.
 */
function walkWithScopes(program: Node, visit: (node: Node, scopes: readonly Scope[]) => Node[] | null): void {
    const scopes: Scope[] = [];
    (function walk(node: Node): void {
        const opensScope = node.type === 'Program' || isFunctionNode(node);
        if (opensScope) scopes.push(buildScope(node, isFunctionNode(node) ? node.params : []));
        const children = visit(node, scopes) ?? childNodes(node, nonExpressionKeys(node));
        children.forEach(walk);
        if (opensScope) scopes.pop();
    })(program);
}

/** Resolves a bound identifier to its initializer, following alias chains. */
function resolveIdentifier(scopes: readonly Scope[], expression: Node, hops: number): Node | null {
    if (expression.type !== 'Identifier' || hops > MAX_ALIAS_HOPS) return expression;
    const binding = lookup(scopes, expression.name);
    if (binding === undefined) return expression;
    return binding === null ? null : resolveIdentifier(scopes, binding, hops + 1);
}

/** Whether `expression` denotes the sandbox global object (`globalThis`, `global`, or an alias/ternary of them). */
function isGlobalObject(scopes: readonly Scope[], expression: Node, hops = 0): boolean {
    const resolved = resolveIdentifier(scopes, expression, hops);
    if (!resolved) return false;
    if (resolved.type === 'Identifier') return GLOBAL_OBJECT_NAMES.has(resolved.name) && lookup(scopes, resolved.name) === undefined;
    if (resolved.type === 'ConditionalExpression') {
        return isGlobalObject(scopes, resolved.consequent, hops + 1) && isGlobalObject(scopes, resolved.alternate, hops + 1);
    }
    return false;
}

function staticPropertyName(member: MemberNode): string | null {
    return !member.computed && member.property.type === 'Identifier' ? member.property.name : null;
}

/** Whether `expression` evaluates to the `hablla` global (bare, via the global object, or through an alias). */
function isHabllaGlobal(scopes: readonly Scope[], expression: Node, hops = 0): boolean {
    if (expression.type === 'Identifier') {
        const binding = lookup(scopes, expression.name);
        if (binding === undefined) return expression.name === HABLLA_GLOBAL;
        return binding !== null && hops < MAX_ALIAS_HOPS && isHabllaGlobal(scopes, binding, hops + 1);
    }
    return isMemberNode(expression) && staticPropertyName(expression) === HABLLA_GLOBAL && isGlobalObject(scopes, expression.object, hops);
}

/** A member chain split into its innermost non-member base and the member nodes from inner to outer. */
function flattenMemberChain(outermost: MemberNode): { base: Node; members: MemberNode[] } {
    const members: MemberNode[] = [];
    let current: Node = outermost;
    while (isMemberNode(current)) {
        members.unshift(current);
        current = current.object;
    }
    return { base: current, members };
}

/**
 * Extracts every member of `globalThis.hablla` a piece of live code (e.g. a flow code
 * node) uses, as sorted, de-duplicated dotted paths up to two levels deep
 * (`hablla.dispatch.run(...)` → `dispatch.run`). Accepts top-level `return`/`await`.
 * @param source The JavaScript source to analyze.
 * @returns The referenced member paths.
 * @throws When the source does not parse, or uses the global in a way that cannot be
 *   verified statically (computed member, destructuring, passing it around).
 */
export function extractHabllaReferences(source: string): string[] {
    const program = parseJavaScript(source, CODE_NODE_PARSER, 'Live code');
    const paths = new Set<string>();

    walkWithScopes(program, (node, scopes) => {
        if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init && isHabllaGlobal(scopes, node.init)) {
            return [];
        }
        if (node.type === 'UnaryExpression' && node.operator === 'typeof' && isHabllaGlobal(scopes, node.argument)) {
            return [];
        }
        if (isMemberNode(node)) {
            const { base, members } = flattenMemberChain(node);
            const rootIndex = [base, ...members].findIndex((candidate) => isHabllaGlobal(scopes, candidate));
            if (rootIndex >= 0) {
                const accessed = members.slice(rootIndex, rootIndex + MEMBER_PATH_DEPTH);
                if (accessed.length === 0) throw unverifiableUsage(node);
                const names = accessed.map(staticPropertyName);
                if (names.includes(null)) throw unverifiableUsage(node);
                paths.add(names.join('.'));
                return members.filter((member) => member.computed).map((member) => member.property);
            }
            return null;
        }
        if (isHabllaGlobal(scopes, node)) throw unverifiableUsage(node);
        return null;
    });

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
        childNodes(node).forEach(collect);
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
            const name = staticPropertyName(node.left);
            if (name) {
                shape.members.add(name);
                const fieldClass = instantiatedClass(node.right);
                if (fieldClass) shape.fieldClasses.set(name, fieldClass);
            }
        }
        childNodes(node).forEach(collect);
    })(body);
}

/** Resolves `name` up the superclass chain of a bundle's classes. */
function classLineage(classes: ReadonlyMap<string, ClassShape>, name: string): ClassShape[] {
    const lineage: ClassShape[] = [];
    for (let current = classes.get(name); current && lineage.length <= MAX_ALIAS_HOPS; current = current.superName ? classes.get(current.superName) : undefined) {
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

/** The class an expression evaluates to an instance of, when statically known. */
function classOfExpression(classes: ReadonlyMap<string, ClassShape>, scopes: readonly Scope[], expression: Node, hops = 0): string | null {
    if (hops > MAX_ALIAS_HOPS) return null;
    const direct = instantiatedClass(expression);
    if (direct) return classes.has(direct) ? direct : null;
    if (expression.type === 'Identifier') {
        const binding = lookup(scopes, expression.name);
        return binding ? classOfExpression(classes, scopes, binding, hops + 1) : null;
    }
    if (isMemberNode(expression)) {
        const owner = classOfExpression(classes, scopes, expression.object, hops + 1);
        const member = staticPropertyName(expression);
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

/**
 * Lists the member paths of `globalThis.hablla` that a set of RPO bundles exposes once
 * they all run: the members of the instance assigned to the global (two levels deep)
 * plus any member attached to it afterwards (a compatibility facade).
 * @param bundles The class bodies to publish, keyed by class name.
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
        walkWithScopes(program, (node, scopes) => {
            if (node.type !== 'AssignmentExpression' || !isMemberNode(node.left)) return null;
            const member = staticPropertyName(node.left);
            if (isHabllaGlobal(scopes, node.left)) {
                const rootClass = classOfExpression(classes, scopes, node.right);
                if (!rootClass) throw new Error(`${name} assigns globalThis.${HABLLA_GLOBAL} a value whose class cannot be resolved`);
                instancePaths(classes, rootClass, '').forEach((path) => paths.add(path));
                published = true;
            } else if (member && isHabllaGlobal(scopes, node.left.object)) {
                paths.add(member);
                const attachedClass = classOfExpression(classes, scopes, node.right);
                if (attachedClass) instancePaths(classes, attachedClass, member).forEach((path) => paths.add(path));
            }
            return null;
        });
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
