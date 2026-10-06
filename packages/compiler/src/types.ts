/**
 * Utilities recognized by named runtime imports
 */
export type UtilityType =
    | 'id'
    | 'idSelector'
    | 'className'
    | 'classSelector'
    | 'animation'
    | 'variable'
    | 'container'
    | 'font'
    | 'layer'
    | 'variants'
    | 'style'
    | 'theme';
export type UtilityWithCounterType = Exclude<
    UtilityType,
    'classSelector' | 'variants' | 'style' | 'idSelector' | 'theme'
>;
/**
 * Key generator
 */
export interface KeyGen {
    /**
     * Global prefix prepended to every name
     */
    prefix: string;
    /**
     * CSS classname
     */
    readonly className: string;
    /**
     * Same as className, also a selector
     */
    readonly classSelector: string;
    /**
     * Animation keyframe name
     */
    readonly animation: string;
    /**
     * CSS custom property token
     */
    readonly variable: string;
    /**
     * Cascade layer name
     */
    readonly layer: string;
    /**
     * Container query name
     */
    readonly container: string;
    /**
     * Font-family name
     */
    readonly font: string;
    /**
     * HTML id name
     */
    readonly id: string;
    /**
     * Same as id, also a selector
     */
    readonly idSelector: string;
}

/**
 * Literal values useful for CSS generation
 */
export type LiteralValue =
    | string
    | number
    | boolean
    | null
    | LiteralValue[]
    | { [key: string]: LiteralValue };

/**
 * CSS chunk category; defines aggregation order
 */
export type ChunkType = 'layer' | 'font' | 'variable' | 'animation' | 'other';

/**
 * Generated CSS fragment
 */
export type CSSChunk = {
    key: string;
    css: string;
    type: ChunkType;
    deps?: string[];
};

export type Severity = 'warn' | 'error';

/**
 * Diagnostic message with position and severity
 */
export type DiagnosticMessage = {
    file: string;
    message: string;
    severity: Severity;
    line?: number;
    column?: number;
};

/**
 * Result of compiling a module
 */
export type CompileResult = {
    code: string;
    diagnostics: DiagnosticMessage[];
    changed: boolean;
    executedModules?: Map<string, ExecutedModule>;
};

/**
 * Resolved contract-module import target
 */
export interface ResolvedContract {
    file: string;
    source: string;
}

/**
 * Options for executing a contract module graph
 */
export interface ExecutorOptions {
    /**
     * Key generator
     */
    keys: KeyGen;
    /**
     * Warn
     */
    warn(config: Omit<DiagnosticMessage, 'severity'>): void;
    /**
     * Error (falls back to `warn` when omitted)
     */
    error?(config: Omit<DiagnosticMessage, 'severity'>): void;
    /**
     * Resolve imports to contract modules
     */
    loadContract: (
        specifier: string,
        importerFile: string
    ) => ResolvedContract | null;
    /**
     * Shared exports cache to avoid re-execution
     */
    exportCache?: Map<string, Record<string, unknown>>;
}

/** Executed contract module: code + its CSS chunks. */
export interface ExecutedModule {
    /**
     * Absolute module path
     */
    file: string;
    /**
     * ESM source with literals replacing utilities
     */
    code: string;
    /**
     * CSS chunks registered by this module only
     */
    cssChunks: CSSChunk[];
}

/**
 * Executed contract graph for one root
 */
export interface ExecutedGraph {
    /**
     * The requested root module
     */
    root: ExecutedModule;
    /**
     * Executed modules keyed by path
     */
    modules: Map<string, ExecutedModule>;
}

/**
 * Storage of executed utility results, keyed by utility type, in execution order
 */
export interface ResultStore {
    /**
     * Record a result for a utility kind (in execution order)
     */
    set(kind: UtilityType, value: unknown): void;
    /**
     * Read the `index`-th recorded result for a utility kind
     */
    get(kind: UtilityType, index: number): unknown;
    /**
     * Number of recorded results for a utility kind
     */
    count(kind: UtilityType): number;
}

/**
 * Diagnostic node
 */
export interface Diagnostics {
    /**
     * Emit a warning
     */
    warn(config: Omit<DiagnosticMessage, 'severity'>): void;
    /**
     * Emit an error
     */
    error(config: Omit<DiagnosticMessage, 'severity'>): void;
}

/**
 * Callbacks passed to `reconstruct`: result reads + diagnostics.
 */
export interface ReconstructCallbacks {
    /**
     * Read the `index`-th recorded result for a utility kind
     */
    getResult(kind: UtilityType, index: number): unknown;
    /**
     * Number of recorded results for a utility kind
     */
    getCount(kind: UtilityType): number;
    /**
     * Emit a warning
     */
    warn(config: Omit<DiagnosticMessage, 'severity'>): void;
    /**
     * Emit an error
     */
    error(config: Omit<DiagnosticMessage, 'severity'>): void;
}

/**
 * Options for reconstructing an executed module
 */
export interface ReconstructOptions {
    /**
     * Original module source
     */
    source: string;
    /**
     * Module filename
     */
    filename: string;
    /**
     * Result and diagnostic handlers
     */
    callbacks: ReconstructCallbacks;
}

/**
 * Runtime API for `@css-zero/core`
 */
export interface Runtime {
    id(style?: Record<string, unknown>): string;
    idSelector(style?: Record<string, unknown>): [string, string];
    className(style?: Record<string, unknown>): string;
    classSelector(style?: Record<string, unknown>): [string, string];
    variable(config?: Record<string, unknown>): [string, string];
    animation(config?: Record<string, unknown>): string;
    layer(): string;
    container(type?: string): [string, string];
    font(config?: Record<string, unknown>): string;
    style(config: Record<string, unknown>, deps?: string[]): '';
    variants(
        config: Record<string, unknown>,
        base?: string
    ): Record<string, string>;
    theme(
        vars: Record<string, unknown>,
        options: Record<string, Record<string, unknown>>
    ): [Record<string, string>, Record<string, string>];
}

/**
 * Compiler entry options
 */
export interface CompileOptions {
    /** 
     * Keys generator
     */
    keys: KeyGen;
    /**
     * Resolves contract-module imports
     */
    resolveContract?: (
        specifier: string,
        importerFile: string
    ) => ResolvedContract | null;
    /**
     * Whether an import should be stripped
     */
    isContractImport?: (specifier: string, importerFile: string) => boolean;
    /**
     * Shared cache of executed contract exports
     */
    exportCache?: Map<string, Record<string, unknown>>;
}

/**
 * Options for the compiler facade.
 */
export interface CSSZeroCompilerOptions {
    /**
     * Name prefix for every token (default 'o'); validated against /^[a-z][a-zA-Z0-9-]*$/
     */
    prefix?: string;
    callbacks?: {
        /**
         * Extra module-id normalizer applied after the base one.
         */
        normalizeModuleId?: (id: string) => string;
    };
}

/**
 * A contract-module dependency graph resolver/loader, supplied by the bundler.
 */
export interface ContractGraphContext {
    resolve: (
        id: string,
        importer?: string
    ) => Promise<{ id: string } | null>;
    load: (id: string) => Promise<{ code: string | null } | null>;
}

/**
 * Result of a single `consume()` call.
 */
export interface ConsumeResult {
    /** Consumed (transformed) code, or null when the module was not processed. */
    code: string | null;
    /** Diagnostics collected during this consume. */
    diagnostics: DiagnosticMessage[];
}
