# @css-zero/vite-plugin

> **Reuse-sharpened CSS-in-TS with zero runtime.**

`@css-zero/vite-plugin` is the **Vite facade** of CSS-Zero. It calls [`@css-zero/compiler`](../compiler/README.md) in `transform`, aggregates CSS chunks into a single CSS asset (build) or a dev module (HMR), strips the `@css-zero/core` import, and tree-shakes CSS by token.

## Niche

CSS-Zero follows the **Tailwind model**: a single CSS file, filled during the build by scanning tokens used in the code. Unlike Tailwind (utility classes), CSS-Zero is CSS-in-TS — you write real CSS in `.css.ts` modules, and the compiler tree-shakes it down to the tokens actually used. The result is one `css-zero.css` per bundle, correctly tree-shaken against the final JS.

## Install

```bash
pnpm add @css-zero/core @css-zero/vite-plugin
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cssZero } from '@css-zero/vite-plugin';

export default defineConfig({
    plugins: [react(), cssZero()],
});
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `prefix` | `string` | `'o'` | Name prefix for every token (`o-s_1`, `--o-v_1`). Validated against `/^[a-z][a-zA-Z0-9]*$/`. |
| `build.inline` | `boolean` | `false` | Whether the critical (entry) CSS is inlined into a `<style>` tag in the HTML `<head>` instead of being linked via `<link>`. Build-only: in dev the plugin always serves CSS via a `<link>` to `/css-zero.css`. |

## Example

Write styles in a `.css.ts` contract module:

```ts
// styles.css.ts
import { className, variable, style } from '@css-zero/core';

export const [brand, brandRef] = variable('#2b6cb0');
export const btn = className({ color: brandRef, ':hover': { color: 'blue' } });

// Global styles — always emitted.
style({ body: { margin: 0 } });

// Conditional styles — emitted only if `btn` is used.
style({ [`.${btn} > span`]: { display: 'block' } }, [btn]);
```

Then import the tokens in your components:

```tsx
import { btn } from './styles.css';

export function Button() {
    return <button className={btn}>Click</button>;
}
```

## Multi-page apps (MPA)

The plugin is built around a **single entrypoint** (SPA): it injects the CSS `<link>`/`<style>` into the HTML asset(s) of the bundle. For an MPA, build each page as its own SPA build (one entrypoint per build) rather than one build with multiple HTML inputs:

```ts
// vite.config.page-a.ts
export default defineConfig({
    plugins: [cssZero()],
    build: { rollupOptions: { input: 'page-a.html' } },
});
```

Each page gets its own CSS, correctly tree-shaken against that page's JS. A single build with multiple HTML inputs is not supported — the CSS would be injected into every HTML asset.

## How it works

- **`consume`** — compiles each module, collects `cssChunks`, and strips the import.
- **Aggregation** — chunks are indexed by token (`cssByToken`) and grouped by category (`layer` → `font` → `variable` → `animation` → `rule`).
- **Tree-shaken CSS** — `produce(code)` emits only the CSS whose token is present in the given code (the final JS). Special `style` chunks are filtered by their `deps`: `[]` always emitted, non-empty emitted only if all deps are used.
- **Minification** — the aggregated CSS is compacted (whitespace/newlines collapsed) before emission.
- **Output** — one `css-zero.css` asset is emitted (via `produce(allJs)`) and linked via `<link>` in `writeBundle`; with `build.inline` the CSS is injected as a `<style data-css-zero>` tag into `<head>` instead.
- **`base` aware** — asset URLs respect Vite's `base` (captured in `configResolved`), so deployments under a sub-path work.
- **Idempotent injection** — every injected `<link>`/`<style>` carries a `data-css-zero` attribute; `writeBundle` strips any existing `data-css-zero` elements before injecting, so repeated builds don't duplicate CSS.
- **HMR** — module tokens are tracked so re-requests don't accumulate duplicates.
- **Deterministic names** — a shared `KeyGen` (token counter) per build, reset in `buildStart`, keeps CSS↔JS names consistent.

## License

Apache-2.0