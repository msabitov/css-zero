# @css-zero/compiler

> **Reuse-sharpened CSS-in-TS with zero runtime.**

`@css-zero/compiler` is the **build-tool-agnostic compile engine** of CSS-Zero. It turns CSS-in-TS contract modules (`.css.ts` / `.css.js`) into plain string constants and CSS, with **zero runtime** in the browser. It knows nothing about Vite, Rollup or webpack — a thin plugin wires it into a specific build tool.

## Public API

```ts
import { createCompiler } from '@css-zero/compiler';
```

`createCompiler(options)` returns a stateful `Compiler` that accumulates CSS chunks, module bindings and a monotonic token counter across the build.

### Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `prefix` | `string` | `'o'` | Token name prefix (e.g. `o-s_1`). Validated against `/^[a-z][a-zA-Z0-9]*$/`; falls back to `'o'`. |
| `callbacks.normalizeModuleId` | `(id: string) => string` | — | Extra id normalizer applied after the built-in one (e.g. strip a virtual prefix). |

### Methods

The surface is deliberately small — one method per core task. Everything else (id normalization, chunk indexing, token lookup) is internal.

| Method | What it does |
| --- | --- |
| `consume(code, id, graph?)` | Compiles one module → `{ code, diagnostics }`. Non-contract modules pass through (`code: null`); contract modules are executed, utility calls substituted with string constants, CSS chunks collected. |
| `produce(code?)` | Emits CSS as a single string. Without `code` — all accumulated CSS; with one — only the CSS whose token appears in that code (e.g. a JS chunk), so styles follow the chunk that uses them. |
| `reset()` | Clears CSS, module bindings, the token counter and all caches (new build frame / HMR). |
| `prefix` (getter) | The resolved token prefix. |

## How it works in a typical build

The compiler is driven by a plugin (e.g. [`@css-zero/vite-plugin`](../vite-plugin/README.md)):

```text
createCompiler({ prefix, callbacks })
        │
        ▼
   consume(code, id, graph) ──► { code, diagnostics }  (per module)
        │
        ▼
   produce(code?)               emit CSS (whole, or filtered by the given code)
```

1. **Setup** — the plugin creates a `Compiler` once per build.
2. **Consume** — the plugin calls `consume(code, id, graph)` per module. Contract modules are executed in a sandboxed `require` context: the compiler resolves/loads their imports through `graph`, captures every utility call's value, and reconstructs the source with those values as string constants. CSS chunks are collected per module.
3. **Dev** — the plugin serves `produce()` as a single CSS module.
4. **Produce** — the plugin calls `produce()` (whole CSS) or `produce(code)` (CSS filtered by the tokens in the given code, e.g. a JS chunk), then writes a file, inlines it, or links it.

## Usage outside Vite

`@css-zero/compiler` is bundler-agnostic. Create a `Compiler`, call `consume` per module with a `ContractGraphContext` that resolves/loads contract imports, then `produce` and emit. For Vite, use [`@css-zero/vite-plugin`](../vite-plugin/README.md), which does all of this.

## License

Apache-2.0