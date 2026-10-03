/** css-zero/compiler — executed contract-module reconstruction */
import type {
    CallExpression,
    File,
    ImportDeclaration,
    Node,
    Statement,
} from '@babel/types';
import type { ReconstructOptions, UtilityType } from './types';
import {
    isArrowFunctionExpression,
    isCallExpression,
    isClassMethod,
    isClassPrivateMethod,
    isFunctionDeclaration,
    isFunctionExpression,
    isIdentifier,
    isImportDeclaration,
    isImportSpecifier,
    isObjectMethod,
} from '@babel/types';
import { parse as babelParse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import MagicString from 'magic-string';
import { PACKAGE_NAME, UTILS } from './constants';
import { isObject } from './utils';

// @babel/traverse is a CJS module; in real Node ESM the default import
// is `{ default, Hub, ... }`, while Vitest/bundlers give the function directly.
const traverse = (
    typeof traverseModule === 'function'
        ? traverseModule
        : (traverseModule as unknown as { default: typeof traverseModule }).default
) as typeof traverseModule;


const plugins: import('@babel/parser').ParserPlugin[] = ['typescript'];

/**
 * Parse JS/TS source into a Babel AST
 *
 * Returns `null` when the source cannot be parsed
 */
function parseModule(source: string, filename: string): File | null {
    try {
        return babelParse(source, {
            sourceType: 'module',
            sourceFilename: filename,
            plugins,
            errorRecovery: true,
            allowReturnOutsideFunction: true,
        });
    } catch {
        return null;
    }
}

const SKIP_KEYS = new Set([
    'type',
    'start',
    'end',
    'loc',
    'extra',
    'leadingComments',
    'trailingComments',
    'innerComments',
    'comments',
]);

/**
 * Serialize a computed value back into a JS expression.
 */
function serializeLiteral(value: unknown): string {
    switch (true) {
        case (value === undefined || typeof value === 'number'):
            return value + '';
        case Array.isArray(value):
            return `[${value.map(serializeLiteral).join(',')}]`;
        case isObject(value):
            return `{${Object.keys(value).reduce((acc, key) => {
                acc.push(
                    `${JSON.stringify(key)}:${serializeLiteral(
                        (value as Record<string, unknown>)[key]
                    )}`
                );
                return acc;
            }, [] as string[]).join(',')}}`;
        default:
            return JSON.stringify(value);
    }
}

function removeStmt(stmt: Statement, source: string, magicString: MagicString) {
    const start = stmt.start ?? 0;
    let end = stmt.end ?? start;
    while (end < source.length && source[end] !== '\n') end++;
    magicString.remove(start, end);
}

function isFunctionNode(node: Node): boolean {
    return (
        isFunctionDeclaration(node) ||
        isFunctionExpression(node) ||
        isArrowFunctionExpression(node) ||
        isObjectMethod(node) ||
        isClassMethod(node) ||
        isClassPrivateMethod(node)
    );
}

/**
 * Build a local-name → utility-kind map from `@css-zero/core` imports.
 * Named imports survive bundling (`className as t` → `t → className`)
 */
function buildImportMap(
    ast: import('@babel/types').File
): { map: Map<string, UtilityType>; decls: ImportDeclaration[] } {
    const map = new Map<string, UtilityType>();
    const decls: ImportDeclaration[] = [];
    for (const stmt of ast.program.body) {
        if (!isImportDeclaration(stmt) || stmt.source.value !== PACKAGE_NAME) continue;
        decls.push(stmt);
        for (const spec of stmt.specifiers) {
            if (!isImportSpecifier(spec)) continue;
            const remote = isIdentifier(spec.imported)
                ? spec.imported.name
                : spec.imported.value;
            if (UTILS.has(remote)) map.set(spec.local.name, remote as UtilityType);
        }
    }
    return { map, decls };
}

/**
 * Rebuild a contract module from the values captured at execution time.
 *
 * The executor records, in execution order, the value returned by each utility
 * call into a store per utility type. Here we replace every top-level utility
 * call with the next recorded value of that type. This is independent of how the
 * bundler renamed local variables or re-exported them (`export { o as btn }`).
 */
export function reconstruct(options: ReconstructOptions): string {
    const { source, filename, callbacks: {
        warn, error, getCount, getResult
    } } = options;
    const ast = parseModule(source, filename);
    if (!ast) return source;

    const { map, decls } = buildImportMap(ast);
    if (map.size === 0) return source;

    const topLevel: CallExpression[] = [];
    let depth = 0;

    // Collect top-level utility calls;
    // calls inside functions are unsupported and are reported immediately
    traverse(ast, {
        enter(path) {
            if (isFunctionNode(path.node)) {
                depth++;
            } else if (isCallExpression(path.node)) {
                const callee = path.node.callee;
                if (isIdentifier(callee) && map.has(callee.name)) {
                    if (depth > 0) {
                        warn({
                            file: filename,
                            message: `Utility "${map.get(callee.name)}" called inside a function is not supported; call left unsubstituted.`,
                            line: path.node.loc?.start.line,
                            column: path.node.loc?.start.column,
                        });
                    } else {
                        topLevel.push(path.node);
                    }
                }
            }
        },
        exit(path) {
            if (isFunctionNode(path.node)) depth--;
        },
    });

    // Guard: the number of top-level calls of a type must match the number of
    // recorded results. Otherwise we would substitute wrong values.
    const counts = new Map<UtilityType, number>();
    for (const call of topLevel) {
        const kind = map.get((call.callee as import('@babel/types').Identifier).name)!;
        counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    for (const [kind, count] of counts) {
        const recorded = getCount(kind);
        if (count !== recorded) {
            error({
                message: `Mismatch for "${kind}": ${count} top-level call(s) vs ${recorded} result(s); module left unsubstituted.`,
                file: filename,
            });
            return source;
        }
    }

    const magicString = new MagicString(source);
    const indexByKind = new Map<string, number>();
    for (const call of topLevel) {
        const kind = map.get((call.callee as import('@babel/types').Identifier).name)!;
        const idx = indexByKind.get(kind) ?? 0;
        const value = getResult(kind, idx);
        indexByKind.set(kind, idx + 1);
        if (call.start != null && call.end != null) {
            magicString.overwrite(call.start, call.end, serializeLiteral(value));
        }
    }

    // strip css-zero runtime imports
    for (const decl of decls) removeStmt(decl, source, magicString);

    return magicString.toString();
}
