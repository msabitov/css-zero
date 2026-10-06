# @css-zero/vite-plugin

## 1.0.1

### Patch Changes

- Introduced a constant `SCOPE` to build the plugin name, virtual modules and HTML attributes (`data-css-zero`) from a single source instead of hardcoded strings.
- Simplified prefix validation (compares against `compiler.prefix` instead of re-running the regex).
- Allowed hyphens in the token prefix (validation now `/^[a-z][a-zA-Z0-9-]*$/`).
- Updated dependencies
    - @css-zero/compiler@1.0.1

## 1.0.0

### Major Changes

- The First release

### Patch Changes

- Updated dependencies
    - @css-zero/compiler@1.0.0
