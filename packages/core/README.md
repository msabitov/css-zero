<p align="center">
  <a href="https://effnd.tech/css-zero/">
    <img alt="css-zero" src="https://effnd.tech/css-zero/logo.svg" height="256px" />
  </a>
</p>

<h1 align="center">CSS-Zero</h1>

<div align="center">

[![license](https://badgen.net/static/license/Apache%202.0/blue)](https://sourcecraft.dev/msabitov/css-zero/packages/core/browse/LICENSE?rev=master)
[![npm latest package](https://badgen.net/npm/v/@css-zero/core)](https://www.npmjs.com/package/@css-zero/core)

</div>

> **Reuse-sharpened CSS-in-TS with zero runtime**

CSS-Zero is inspired by Vanilla Extract: you write styles in **contract modules** — files named `*.css.ts` / `*.css.js`. Every utility returns a plain string (or strings inside arrays/flat objects), and at build time the compiler executes the contract-module graph, substitutes each utility call with a deterministic token, and emits the matching CSS as a chunk. Unused styles are tree-shaken away, so only the CSS you actually use ships.

Because contract modules are ordinary modules, you can publish your styles as separate npm packages and consume them as standard dependencies — CSS-Zero processes them the same way as your own files.

`@css-zero/core` provides the **real utility types** and **string stubs** for `tsc`/IDE. It is **not the working path** — outside a bundler it returns empty strings. The working path goes through the [`@css-zero/vite-plugin`](../vite-plugin/README.md), which produces the real CSS and removes the TypeScript source files.

## Invariant

> **Every utility returns a plain string or strings inside arrays/flat objects**

## Utilities

### Individual rules

| Utility | Signature | Returns |
| --- | --- | --- |
| `id` | `(rule?) => string` | Unique id token |
| `idSelector` | `(rule?) => [string, string]` | `[name, '#name']` |
| `className` | `(rule?) => string` | Unique class token |
| `classSelector` | `(rule?) => [string, string]` | `[name, '.name']` |
| `variable` | `(config?) => [string, string]` | `[--name, 'var(--name)']` |
| `animation` | `(config?) => string` | Unique `@keyframes name` token |
| `layer` | `() => string` | Unique `@layer name` token |
| `font` | `(config?) => string` | Unique `@font-face` family token |
| `container` | `(type?) => [string, string]` | `[container, '@container name']` |

### Composed rules

| Utility | Signature | Returns |
| --- | --- | --- |
| `style` | `(config, deps?) => string` | Unconditional global styles (no deps) or conditional AND chunk |
| `variants` | `(config, base?) => Record<string, string>` | Modifier token map, `.base.mod` selector |
| `theme` | `(vars, options) => [Record<string, string>, Record<string, string>]` | `[varRefs, optionClasses]` |

## Examples

```ts
import { className, variable, style, variants, theme } from '@css-zero/core';

// Class token
export const btn = className({ color: 'white', ':hover': { color: 'gray' } });

// Variable: [name, var(name)]
export const [accent, accentRef] = variable('#2b6cb0');

// Unconditional global styles — always emitted, regardless of usage
style({ body: { margin: 0 } });

// Conditional styles — emitted only if `btn` is used
style({ [`.${btn} > span`]: { display: 'block' } }, [btn]);

// Variant axis with a base token
export const tone = variants({ primary: { color: '#fff' }, ghost: { color: 'gray' } }, btn);

// Theme: [varRefs, optionClasses]
//   tokens.accent  → 'var(--o-v_1)'
//   options.dark   → '.o-s_1' (overrides accent when applied)
export const [tokens, options] = theme(
    { accent: '#2b6cb0', spacing: '8px' },
    { dark: { accent: '#0f0' }, compact: { spacing: '4px' } }
);
```

## Extending types

Merge your own custom properties into `CSSZero.ExtraProperties` via interface declaration merging:

```ts
declare global {
    namespace CSSZero {
        interface ExtraProperties {
            '--brand': string;
        }
    }
}
```

## Important

Outside a bundler (SSR, Jest, `tsc`/IDE), `@css-zero/core` returns **empty strings** — the signatures are correct, the values are placeholders. The working path goes through [`@css-zero/compiler`](../compiler/README.md) and [`@css-zero/vite-plugin`](../vite-plugin/README.md).

## License

Apache-2.0
