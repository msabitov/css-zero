# @css-zero/compiler

## 1.0.2

### Patch Changes

- Scan emitted CSS for tokens referenced only from CSS (variables, animations, layers, fonts, …) and pull in their chunks transitively, so filtered output stays self-contained even when a CSS rule references a token that never appears in JS code.

## 1.0.1

### Patch Changes

- Introduced a constant `SCOPE` to build the package name from a single source instead of hardcoded strings. `SCOPE` is now exported from the package entry.
- Allowed hyphens in the token prefix (validation now `/^[a-z][a-zA-Z0-9-]*$/`).

## 1.0.0

### Major Changes

- The First release
