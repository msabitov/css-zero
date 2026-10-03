import type {
    CSSChunk,
    Diagnostics,
    ExecutedGraph,
    ExecutedModule,
    ExecutorOptions,
    ResultStore,
} from './types';
import { transformSync } from 'esbuild';
import path from 'node:path';
import { createRuntime } from './runtime';
import { reconstruct } from './reconstruct';
import { isCSSZeroImport } from './utils';

/**
 * Executed node
 */
interface ExecutedNode {
    file: string;
    source: string;
    cssChunks: CSSChunk[];
    /**
     * Values returned by each utility call, grouped by utility type, in execution order.
     * Used by `reconstruct` to substitute top-level calls
     */
    results: ResultStore;
}

/**
 * Internal state of one top-level execution
 */
interface ExecutorState {
    options: ExecutorOptions;
    exportsCache: Map<string, Record<string, unknown>>;
    nodes: Map<string, ExecutedNode>;
    diagnostics: Diagnostics;
}

/**
 * Transpile a file to CJS
 */
function transpile(file: string, source: string): string {
    return transformSync(source, {
        loader: /\.ts$/.test(file) ? 'ts' : 'js',
        format: 'cjs',
        target: 'es2020',
        sourcefile: file,
        sourcemap: false,
    }).code;
}

/**
 * Create a `ResultStore` backed by a `Record<kind, unknown[]>`
 */
function createResultStore(): ResultStore {
    const data: Record<string, unknown[]> = {};
    return {
        set(kind, value) {
            (data[kind] ??= []).push(value);
        },
        get(kind, index) {
            return data[kind]?.[index];
        },
        count(kind) {
            return data[kind]?.length ?? 0;
        },
    };
}

/**
 * Create diagnostics node from executor options
 */
function createDiagnostics(options: ExecutorOptions): Diagnostics {
    return {
        warn: (config) => options.warn(config),
        error: (config) => (options.error ?? options.warn)(config),
    };
}

/**
 * Reconstructs nodes and assembles the final graph
 */
function buildGraph(
    topFile: string,
    topSource: string,
    state: ExecutorState
): ExecutedGraph {
    const rebuild = (file: string, src: string): ExecutedModule => {
        const node = state.nodes.get(file);
        const results = node?.results ?? createResultStore();
        return {
            file,
            code: reconstruct({
                source: src,
                filename: file,
                callbacks: {
                    getResult: (kind, index) => results.get(kind, index),
                    getCount: (kind) => results.count(kind),
                    warn: state.diagnostics.warn,
                    error: state.diagnostics.error,
                },
            }),
            cssChunks: [],
        };
    };

    const modules = new Map<string, ExecutedModule>();

    for (const node of state.nodes.values()) {
        const result = rebuild(node.file, node.source);
        modules.set(node.file, {
            ...result,
            cssChunks: node.cssChunks
        });
    }

    // Root is guaranteed even after partial failure
    if (!modules.has(topFile)) modules.set(topFile, rebuild(topFile, topSource));

    const root = modules.get(topFile)!;
    return { root, modules };
}

/**
 * Runs a CJS module in a trusted build context, recursing over contract deps
 */
function runModule(
    file: string,
    source: string,
    transpiled: string,
    state: ExecutorState
): Record<string, unknown> {
    const { options, exportsCache, nodes } = state;

    const existingNode = nodes.get(file);
    if (existingNode) {
        // Already executed (cycle/repeat)
        return exportsCache.get(file) ?? {};
    }
    const cachedExports = exportsCache.get(file);
    if (cachedExports) return cachedExports;

    const { keys, loadContract } = options;
    const warn = (message: string) => options.warn({
        file,
        message
    });
    const emit = (c: CSSChunk) => chunksThis.push(c);
    // Module-local chunk collector, separate from deps
    const chunksThis: CSSChunk[] = [];
    // Values returned by each utility call, grouped by type, in execution order.
    const results = createResultStore();
    const coreStub = createRuntime({
        keys,
        callbacks: {
            emit,
            warn,
            write: (kind, value) => results.set(kind, value),
        },
    });

    // Register node early to handle cycles
    const node: ExecutedNode = {
        file,
        source,
        cssChunks: chunksThis,
        results,
    };
    nodes.set(file, node);

    const requireFn = (specifier: string): unknown => {
        if (isCSSZeroImport(specifier)) return coreStub;
        const resolved = loadContract(specifier, file);
        if (!resolved) {
            throw new Error(
                `Import "${specifier}" from "${file}" is not a css-zero contract module`
            );
        }
        const cached = exportsCache.get(resolved.file);
        if (cached) return cached;
        const transpiledDep = transpile(resolved.file, resolved.source);
        const depExports = runModule(
            resolved.file,
            resolved.source,
            transpiledDep,
            state
        );
        exportsCache.set(resolved.file, depExports);
        return depExports;
    };

    // Contract modules are trusted code (like vanilla-extract)
    // so we can execute them in the current build process with a mocked `require`
    const moduleObj: { exports: Record<string, unknown> } = { exports: {} };
    const dirname = path.dirname(file);

    const fn = new Function(
        'module',
        'exports',
        'require',
        '__filename',
        '__dirname',
        `${transpiled}\n`
    );
    fn(moduleObj, moduleObj.exports, requireFn, file, dirname);

    exportsCache.set(file, moduleObj.exports);
    return moduleObj.exports;
}

/**
 * Executes a contract module and its whole graph
 */
export function executeContractModule(
    file: string,
    source: string,
    options: ExecutorOptions
): ExecutedGraph {
    const base = { file, line: 0, column: 0 };
    const state: ExecutorState = {
        options,
        exportsCache: options.exportCache ?? new Map<string, Record<string, unknown>>(),
        nodes: new Map(),
        diagnostics: createDiagnostics(options),
    };

    try {
        const transpiledJS = transpile(file, source);
        runModule(file, source, transpiledJS, state);
    } catch (err) {
        state.diagnostics.error({
            ...base,
            message: `Failed to execute contract module (${(err as Error).name}: ${(err as Error).message}); module left unsubstituted.`
        });
    }

    return buildGraph(file, source, state);
}
