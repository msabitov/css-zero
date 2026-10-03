/**
 * css-zero/vite — vite plugin for css-zero compilation
 */
import type { ModuleNode, Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { createCompiler } from '@css-zero/compiler';

const VIRTUAL_CSS = `\0css-zero:global.css`;
const PREFIX_CSS = `css-zero:`;

// A built entry in the output bundle
interface OutputEntry {
    type: string;
    code?: string;
    fileName?: string;
    source?: string | Uint8Array;
}

export interface CSSZeroViteOptions {
    /**
     * Name prefix for every token (default 'o'); validated against /^[a-z][a-zA-Z0-9]*$/
     */
    prefix?: string;
    /**
     * Build-time CSS emission params
     */
    build?: {
        /**
         * Whether the critical (entry) CSS is inlined into a `<style>` tag in
         * the HTML `<head>` instead of being linked via `<link>`
         */
        inline?: boolean;
    };
}

export function cssZero(opts: CSSZeroViteOptions = {}): Plugin {
    const inline = opts.build?.inline ?? false;
    // Vite `base` (default '/'); used to build absolute asset URLs so they
    // respect deployments under a sub-path (e.g. base: '/app/').
    let base = '/';
    // Whether the plugin runs under the dev server (`vite serve`) vs a build.
    let isDev = false;
    // Full CSS for inline (kept and injected into the built HTML).
    let inlineCss = '';
    // Vite dev server (set in `configureServer`); used to eagerly transform
    // contract modules before serving the virtual CSS, avoiding a race where
    // `css-zero.css` is loaded before a `.css.ts` module has accumulated CSS.
    let server: import('vite').ViteDevServer | undefined;
    const compiler = createCompiler({
        prefix: opts.prefix,
        callbacks: {
            // Vite dev serves files outside the project root via the `/@fs/`
            // prefix; strip it so ids match plain filesystem paths.
            normalizeModuleId: (id) =>
                id.startsWith('/@fs/') ? id.slice('/@fs/'.length) : id,
        },
    });

    const plugin: Plugin = {
        name: 'css-zero',
        enforce: 'pre',

        configResolved(config) {
            base = config.base ?? '/';
            isDev = config.command === 'serve';
        },

        configureServer(_server) {
            server = _server;
        },

        buildStart() {
            // New frame: reset accumulated CSS, module bindings, and the name counter.
            if (opts.prefix && !/^[a-z][a-zA-Z0-9]*$/.test(opts.prefix)) {
                this.warn(
                    `Invalid prefix "${opts.prefix}" (expected /^[a-z][a-zA-Z0-9]*$/), using "o"`
                );
            }
            compiler.reset();
            inlineCss = '';
        },

        // In dev the CSS is wired via an `import` of the virtual module added
        // in `transform` (so Vite controls the timing and HMR). In build the
        // CSS is wired via generateBundle/writeBundle. No HTML injection here

        resolveId(id: string) {
            if (
                id === 'css-zero.css' ||
                id === `${base}css-zero.css` ||
                id === PREFIX_CSS
            ) {
                return VIRTUAL_CSS;
            }
            return null;
        },

        async load(id: string) {
            if (id !== VIRTUAL_CSS) return null;
            // In dev, eagerly transform every contract module already in the
            // module graph. This guarantees their CSS is accumulated before we
            // serve the virtual CSS — otherwise a race can drop styles.
            // `consume()` caches executed modules,
            // so re-transforming is idempotent and never duplicates CSS.
            if (server) {
                for (const mod of server.moduleGraph.idToModuleMap.values()) {
                    if (mod.id && /\.css\.(t|j)s$/i.test(mod.id)) {
                        await server.transformRequest(mod.url).catch(() => {});
                    }
                }
            }
            return compiler.produce();
        },

        async transform(code: string, id: string) {
            // For contract files, collect the dependency graph asynchronously,
            // since the executor needs a synchronous resolver (require in sandbox).
            const graph = {
                resolve: async (spec: string, importer?: string) => {
                    const r = await this.resolve(spec, importer);
                    return r ? { id: r.id } : null;
                },
                load: async (target: string) => {
                    // Contract modules are real files on disk (`.css.ts`/`.css.js`).
                    // `this.load()` returns a ModuleInfo whose `code` is not exposed
                    // in Vite 5+, so read the source directly.
                    try {
                        return { code: readFileSync(target, 'utf-8') };
                    } catch {
                        return { code: null };
                    }
                },
            };

            const res = await compiler.consume(code, id, graph);

            for (const d of res.diagnostics) {
                if (d.severity === 'error') {
                    this.error(
                        d.message,
                        d.line !== undefined && d.column !== undefined
                            ? { line: d.line, column: d.column }
                            : undefined
                    );
                } else {
                    this.warn(
                        `${d.message} (${d.file}:${d.line}:${d.column})`
                    );
                }
            }

            if (res.code == null) return null;
            // In dev, import the virtual CSS module so Vite wires the CSS into
            // the page (and HMRs it). The import is added after compilation, so
            // by the time Vite loads the virtual module the CSS is accumulated.
            const outCode = isDev
                ? `import ${JSON.stringify(PREFIX_CSS)};\n${res.code}`
                : res.code;
            return {
                code: outCode,
                map: null,
            };
        },

        async handleHotUpdate(ctx) {
            const file = ctx.file.replace(/\\/g, '/');
            if (!/\.css\.(t|j)s$/i.test(file)) return;

            compiler.reset();

            const graph = ctx.server.moduleGraph;
            const cssModules: ModuleNode[] = [];
            for (const mod of graph.idToModuleMap.values()) {
                if (mod.id && /\.css\.(t|j)s$/i.test(mod.id)) {
                    cssModules.push(mod);
                    graph.invalidateModule(mod);
                }
            }

            // Re-transform every `.css.ts` module so `consume` re-runs and the
            // compiler re-accumulates CSS from the new sources.
            for (const mod of cssModules) await ctx.server.transformRequest(mod.url);

            // Return the virtual CSS module: Vite re-loads it via `load()`
            // (fresh `compiler.produce()`) and pushes a CSS HMR update.
            const vmod = graph.getModuleById(VIRTUAL_CSS);
            if (vmod) graph.invalidateModule(vmod);
            return vmod ? [vmod] : [];
        },

        generateBundle(
            _options: unknown,
            bundle: Record<string, OutputEntry>
        ) {
            // Shake CSS against the final JS, then emit one file. Dead modules
            // and unused exports carry no token, so their styles are dropped.
            const chunks = Object.values(bundle).filter(
                (o): o is OutputEntry & { code: string } =>
                    o.type === 'chunk' && typeof o.code === 'string'
            );
            const js = chunks.map((o) => o.code).join('\n');
            const css = compiler.produce(js);

            if (inline) {
                // Inline into HTML: no file emitted — CSS is kept and injected
                // into the built HTML in writeBundle (the HTML asset is created
                // by Vite's own buildHtmlPlugin, which runs after this hook).
                inlineCss = css;
                return;
            }

            this.emitFile({
                type: 'asset',
                fileName: `css-zero.css`,
                source: css,
            });
        },

        // Build: wire the emitted CSS into the HTML
        writeBundle(options, bundle) {
            const dir = (options as { dir?: string }).dir;
            if (!dir) return;

            // With `inline`, the CSS is injected as a `<style>` tag and no file is emitted.
            // If there is nothing to inline, inject nothing —
            // a `<link>` would point at a file that was never emitted.
            let inject = '';
            if (inline && inlineCss.trim()) inject = `<style data-css-zero>${inlineCss}</style>`;
            else inject = `<link rel="stylesheet" data-css-zero href="${base}css-zero.css">`;

            if (!inject) return;

            for (const file of Object.values(bundle)) {
                if (
                    file.type !== 'asset' ||
                    !file.fileName?.endsWith('.html')
                ) continue;
                const filePath = posix.join(dir, file.fileName);
                const html = readFileSync(filePath, 'utf-8');
                // Remove any previously injected css-zero `<link>`/`<style>`
                // (marked with `data-css-zero`) so repeated builds don't duplicate CSS
                const cleaned = html.replace(
                    /<link[^>]*data-css-zero[^>]*>|<style[^>]*data-css-zero[\s\S]*?<\/style>/gi,
                    ''
                );
                const out = cleaned.includes('</head>')
                    ? cleaned.replace('</head>', `${inject}\n</head>`)
                    : `${inject}\n${cleaned}`;
                writeFileSync(filePath, out);
            }
        },
    };

    return plugin;
}
