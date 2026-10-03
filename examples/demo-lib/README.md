# @css-zero/demo-lib

An example of a **standalone styles library** built on CSS-Zero. It shows how to package reusable styles into a separate npm package and consume them in an app as a regular dependency — with zero runtime.

## What it is

`@css-zero/demo-lib` is a set of styles written in contract modules (`*.css.ts`) and published as a standalone package. An app simply imports tokens/classes from it, and the app's CSS-Zero compiler executes the graph of those contract modules and emits the CSS straight into the app's bundle.

```ts
// In the app — a plain import, just like any library.
import { btn } from '@css-zero/demo-lib/buttons';
import { paddingSmX } from '@css-zero/demo-lib/indents';
import { primary } from '@css-zero/demo-lib/vars';
```

## What it exports

| Subpath | Contents |
| --- | --- |
| `@css-zero/demo-lib/buttons` | Button styles |
| `@css-zero/demo-lib/indents` | Indents utils |
| `@css-zero/demo-lib/vars` | Design tokens |

## Principles for building a styles package

To make a styles library work correctly with CSS-Zero, follow these rules:

1. **Write styles in contract modules** — `*.css.ts` / `*.css.js` files. The `.css.ts`/`.css.js` extension marks a module as a contract module, so the app's compiler executes it in full.

2. **Keep `@css-zero/core` in `peerDependencies`.** At runtime the package does not need `@css-zero/core` — it is only needed for types. The consumer already has it (or the plugin provides it).

3. **Build to ES modules preserving the `.css.js` extension.** Output files must keep the `.css.js` marker so the app's compiler recognizes them as contract modules. In Vite this is done via `build.lib.fileName` (see `vite.config.ts`).

4. **Keep `@css-zero/core` external** (`external` in the build). Tokens are resolved by the app's compiler when executing the graph — do not bundle them into the library.

5. **Minify the output JS** (e.g. terser via `build.minify`) — optional. The library should be compact; the `.css.js` marker and the external `@css-zero/core` are kept. This is not a requirement, just a nice-to-have :)

6. **Mark the package `sideEffects: false`.** This lets the bundler tree-shake unused styles: if an export is not used in the app, its CSS does not end up in the bundle.

7. **Export tokens/classes as plain values.** Consumers use them as strings in `className`, `style`, etc. — no runtime is required.

## Build

```bash
pnpm --filter @css-zero/demo-lib build
```

Output — `dist/*.css.js` (minified contract modules) and `dist/types/*.d.ts` (types).

## License

Apache-2.0
