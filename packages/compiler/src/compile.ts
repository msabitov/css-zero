import type {
    ChunkType,
    CompileOptions,
    CompileResult,
    ConsumeResult,
    ContractGraphContext,
    CSSChunk,
    CSSZeroCompilerOptions,
    DiagnosticMessage,
    KeyGen,
    ResolvedContract,
} from './types';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PREFIX, PACKAGE_NAME } from './constants';
import { executeContractModule } from './executor';
import { createKeyGen } from './keys';
import {
    findKeysByRegExp,
    getKeyRegExp,
    isContractFile,
    isCSSZeroImport,
    parseDeps,
    orderChunks,
} from './utils';

const PREFIX_RE = /^[a-z][a-zA-Z0-9-]*$/;
const GRAPH_KEY_SEP = '\u0000';
const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Base module-id normalizer
 */
function normalizeModuleId(id: string): string {
    const ind = id.indexOf('?');
    let path = ind !== -1 ? id.slice(0, ind) : id;
    path = path.startsWith('file://') ? fileURLToPath(path) : path;
    return posix.normalize(path.replace(/\\/g, '/'));
}

/**
 * Minify CSS: collapse whitespace outside strings
 */
function minifyCss(css: string): string {
    return css
        .replace(
            /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\s+/g,
            (m, str) => str ?? ' '
        )
        .trim();
}

/**
 * Compile a single module via the contract executor
 */
function compile(
    source: string,
    filename: string,
    options: CompileOptions
): CompileResult {
    const result: CompileResult = {
        code: source,
        diagnostics: [],
        changed: false,
    };

    // ignore modules without css-zero references
    if (!source.includes(PACKAGE_NAME)) return result;

    const warn = (config: Omit<DiagnosticMessage, 'severity'>) =>
        result.diagnostics.push({ ...config, severity: 'warn' });
    if (!options.resolveContract) {
        warn({
            file: filename,
            message: `Module "${filename}" imports css-zero but no resolveContract provided; module left unsubstituted.`
        });
        return result;
    }

    const graph = executeContractModule(filename, source, {
        keys: options.keys,
        warn,
        loadContract: options.resolveContract,
        exportCache: options.exportCache,
    });
    result.code = graph.root.code;
    result.executedModules = graph.modules;
    result.changed = graph.root.code !== source;
    return result;
}

/**
 * Build-tool-agnostic CSS-Zero compiler
 */
export class Compiler {
    /**
     * Name prefix for every token
     */
    private _prefix: string;
    /**
     * Compiler callbacks
     */
    private _callbacks?: CSSZeroCompilerOptions['callbacks'];

    // Token → CSS chunk
    private _cssByToken = new Map<string, CSSChunk>();
    // Module → its tokens (reset on HMR/re-request)
    private _moduleTokens = new Map<string, Set<string>>();
    // Module → its complex (conditional `style`) chunks
    private _moduleComplexCSS = new Map<string, CSSChunk[]>();
    // Key generator for utils
    private _keys: KeyGen;
    // Cache of executed contract exports (consistent tokens)
    private _exportCache = new Map<string, Record<string, unknown>>();
    // Reconstructed code + chunks of executed contract modules
    private _executedOutput = new Map<
        string,
        { code: string; cssChunks: CSSChunk[] }
    >();

    constructor(options: CSSZeroCompilerOptions = {}) {
        const { prefix, callbacks } = options;
        let prefixChecked = prefix ?? DEFAULT_PREFIX;
        if (!PREFIX_RE.test(prefixChecked)) prefixChecked = DEFAULT_PREFIX;
        this._prefix = prefixChecked;
        this._callbacks = callbacks;
        this._keys = createKeyGen(this._prefix);
    }

    /**
     * Normalize a module id: base normalizer plus optional callback
     */
    private normalizeModuleId(id: string): string {
        const base = normalizeModuleId(id);
        return this._callbacks?.normalizeModuleId
            ? this._callbacks.normalizeModuleId(base)
            : base;
    }

    /**
     * Current name prefix
     */
    get prefix(): string {
        return this._prefix;
    }

    /**
     * Reset accumulated CSS, module bindings, name counter and all caches.
     * Used on HMR: the whole CSS is rebuilt from scratch.
     */
    reset(): void {
        this._cssByToken.clear();
        this._moduleTokens.clear();
        this._moduleComplexCSS.clear();
        this._exportCache.clear();
        this._executedOutput.clear();
        this._keys = createKeyGen(this._prefix);
    }

    /**
     * Index module chunks by token; drop stale tokens on re-request
     */
    private writeChunks(chunks: CSSChunk[], moduleId: string): void {
        const prev = this._moduleTokens.get(moduleId);
        if (prev) for (const t of prev) this._cssByToken.delete(t);

        const cur = new Set<string>();
        const curComplex: CSSChunk[] = [];
        for (const chunk of chunks) {
            if (chunk.deps !== undefined) {
                curComplex.push(chunk);
                continue;
            }
            this._cssByToken.set(chunk.key, chunk);
            cur.add(chunk.key);
        }
        this._moduleTokens.set(moduleId, cur);
        this._moduleComplexCSS.set(moduleId, curComplex);
    }

    /**
     * Produce CSS as a single string. Without `code` — all accumulated CSS;
     * with one — only the CSS whose token appears in that code (e.g. a JS
     * chunk), so styles follow the chunk that uses them
     */
    produce(code?: string): string {
        const used = code ? this.findKeys(code) : undefined;
        const hasFilter = !!used;

        const simpleChunks = Array.from(this._cssByToken.values());
        const byType: Partial<Record<ChunkType, string[]>> = {};
        for (const chunk of simpleChunks) {
            if (hasFilter && !used!.has(chunk.key)) continue;
            (byType[chunk.type] ??= []).push(chunk.css);
        }

        const complexChunks = Array.from(
            this._moduleComplexCSS.values()
        ).flat();
        const parts: string[] = [];
        for (const chunk of complexChunks) {
            if (this.isComplexActive(chunk, used ?? EMPTY_SET, hasFilter))
                parts.push(chunk.css);
        }

        return minifyCss(
            `${orderChunks(byType).join('\n')}\n${parts.join('\n')}`.trim()
        );
    }

    /**
     * Cached output if module was already executed
     */
    private cachedOutput(normId: string): ConsumeResult | null {
        const out = this._executedOutput.get(normId);
        return out ? { code: out.code, diagnostics: [] } : null;
    }

    /**
     * Unique used tokens, filtered by the CSS map
     */
    private findKeys(source: string, map = this._cssByToken): Set<string> {
        const re = getKeyRegExp(this._prefix);
        return findKeysByRegExp(source, re).reduce((used, token) => {
            if (map.has(token)) used.add(token);
            return used;
        }, new Set<string>());
    }

    /**
     * Collect contract dependency graph for the sandbox resolver
     */
    private async collectContractGraph({
        code,
        importer,
        ctx,
    }: {
        code: string;
        importer: string;
        ctx: ContractGraphContext;
    }): Promise<Map<string, ResolvedContract>> {
        const graph = new Map<string, ResolvedContract>();
        const visited = new Set<string>();

        const visit = async (file: string, source: string): Promise<void> => {
            if (visited.has(file)) return;
            visited.add(file);

            const specs = new Set<string>();
            const specRe =
                /(?:^|[;\s])(?:import|export)\s+[\s\S]*?from\s*['"]([^'"]+)['"]/g;
            let m: RegExpExecArray | null;
            while ((m = specRe.exec(source)) !== null) specs.add(m[1]);

            for (const spec of specs) {
                // css-zero runtime is stubbed in the sandbox
                if (isCSSZeroImport(spec)) continue;

                const resolved = await ctx.resolve(spec, file);
                if (!resolved) continue; // unresolvable — not a contract
                const target = this.normalizeModuleId(resolved.id);
                if (!isContractFile(target)) continue; // regular module — leave to bundler

                const loaded = await ctx.load(target);
                if (loaded == null) continue;
                const depSource = loaded.code;
                if (depSource == null) continue;

                graph.set(`${file}${GRAPH_KEY_SEP}${spec}`, {
                    file: target,
                    source: depSource,
                });
                await visit(target, depSource);
            }
        };

        await visit(importer, code);
        return graph;
    }

    /**
     * Consume a single module: compile it and return code with diagnostics
     */
    async consume(
        code: string,
        id: string,
        graph?: ContractGraphContext
    ): Promise<ConsumeResult> {
        const normId = this.normalizeModuleId(id);
        const isContract = isContractFile(normId);

        // Only contract modules are processed; components are untouched
        if (!isContract) return { code: null, diagnostics: [] };

        // Already executed in a parent graph — reuse saved code
        const cached = this.cachedOutput(normId);
        if (cached) return cached;

        // Collect dependency graph asynchronously for the sandbox resolver
        let resolveContract: CompileOptions['resolveContract'];
        let isContractImport: CompileOptions['isContractImport'];
        if (graph) {
            const g = await this.collectContractGraph({
                code,
                importer: normId,
                ctx: graph,
            });
            resolveContract = (specifier, importerFile) =>
                g.get(`${importerFile}${GRAPH_KEY_SEP}${specifier}`) ?? null;
            isContractImport = (specifier, importerFile) =>
                g.has(`${importerFile}${GRAPH_KEY_SEP}${specifier}`);
        }

        // Re-check after await: executed by another graph meanwhile
        if (isContract) {
            const cached = this.cachedOutput(normId);
            if (cached) return cached;
        }

        const res = compile(code, normId, {
            keys: this._keys,
            resolveContract,
            isContractImport,
            exportCache: this._exportCache,
        });

        // Cache reconstructed code + chunks for all graph modules
        if (res.executedModules) {
            for (const [file, mod] of res.executedModules) {
                this._executedOutput.set(file, {
                    code: mod.code,
                    cssChunks: mod.cssChunks,
                });
                this.writeChunks(mod.cssChunks, file);
            }
        }

        if (!res.changed) return { code: null, diagnostics: res.diagnostics };

        return { code: res.code, diagnostics: res.diagnostics };
    }

    /**
     * Whether a complex chunk is active given the used tokens. Without a shake
     * filter, deps are checked against the accumulated CSS map instead.
     */
    private isComplexActive(
        chunk: CSSChunk,
        used: ReadonlySet<string>,
        hasFilter: boolean
    ): boolean {
        // Complex chunks always carry `deps` (writeChunks routes only those here)
        if (!chunk.deps || chunk.deps.length === 0) return true;
        const deps = parseDeps(chunk.deps, this._prefix);
        if (hasFilter) return deps.every((d) => used.has(d));
        return deps.every((d) => this._cssByToken.has(d));
    }
}

/**
 * Create CSS-Zero compiler
 * @param options - compiler options
 */
export function createCompiler(options: CSSZeroCompilerOptions = {}): Compiler {
    return new Compiler(options);
}
