<p align="center">
  <a href="https://effnd.tech/css-zero/">
    <img alt="css-zero" src="https://effnd.tech/css-zero/logo.svg" height="256px" />
  </a>
</p>

<h1 align="center">CSS-Zero</h1>

<div align="center">

[![license](https://badgen.net/static/license/Apache%202.0/blue)](https://sourcecraft.dev/msabitov/css-zero/packages/core/browse/LICENSE?rev=master)
[![npm latest package](https://badgen.net/npm/v/@css-zero/core)](https://www.npmjs.com/package/@css-zero/core)

# CSS-Zero

> **Reuse-sharpened CSS-in-TS with zero runtime.**

- [Docs](https://effnd.tech/css-zero/)
- [GitHub](https://github.com/msabitov/css-zero)
- [SourceCraft](https://sourcecraft.dev/msabitov/css-zero)
- [NPM](https://www.npmjs.com/package/@css-zero/core)

CSS-Zero is a **zero-runtime CSS-in-TS** library. Utilities return only **strings or flat objects of strings** — no runtime, no style tables, no `get()/set()` resolvers, no hydration. CSS is generated **at build time** by the compiler, utility calls are substituted with string constants, and the library import is stripped from the output.

## Why CSS-Zero

Most CSS-in-JS libraries sell either *zero-runtime* or *type-safety*. CSS-Zero's focus is **reuse**: tokens, variants, and conditional styles are first-class, and none of that reuse costs anything at runtime.

- **Zero runtime** — no JS shipped for styling; CSS is compiled away at build time.
- **Reuse-first** — `className`, `variable`, `variants`, and `style(config, deps)` let you compose styles and emit them only when actually used.
- **Deterministic names** — tokens like `o-s_1`, `--o-v_1` are generated from a global monotonic counter, so CSS↔JS names stay consistent across a build.
- **Tree-shaken CSS** — rules whose token disappears from the final JS are dropped.
- **Type-safe** — full `csstype`-based property typing, extensible via `CSSZero.ExtraProperties`.

## How it works

```ts
// styles.css.ts
import { className, variable, style } from '@css-zero/core';

export const accent = variable('#2b6cb0');
export const btn = className({ color: accent[1], ':hover': { color: 'blue' } });

// Global styles — always emitted.
style({ body: { margin: 0 } });

// Conditional styles — emitted only if `btn` is used.
style({ [`.${btn} > span`]: { display: 'block' } }, [btn]);
```

The compiler rewrites these calls to string constants and emits CSS chunks. The Vite plugin aggregates the chunks into a CSS asset (or inlines them into HTML) and strips the import.

## Packages

| Package | Role |
| --- | --- |
| [`@css-zero/core`](packages/core/README.md) | Real utility types + string stubs for `tsc`/IDE |
| [`@css-zero/compiler`](packages/compiler/README.md) | Build-tool-agnostic compile engine: Babel-AST walk, contract-graph execution, string substitution, CSS chunks, diagnostics. |
| [`@css-zero/vite-plugin`](packages/vite-plugin/README.md) | Vite facade: calls `compile` in `transform`, aggregates chunks, inlines into HTML or emits a file, strips imports. |

## Quick start

```bash
npm i @css-zero/core @css-zero/vite-plugin
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cssZero } from '@css-zero/vite-plugin';

export default defineConfig({
    plugins: [react(), cssZero()],
});
```

Then write styles in `.css.ts` files and import the tokens in your components.

## License

Apache-2.0