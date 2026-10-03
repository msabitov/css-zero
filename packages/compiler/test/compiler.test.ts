import { describe, it, expect } from 'vitest';
import { createCompiler } from '../src/index';
import type { ContractGraphContext } from '../src/index';

// A resolver/loader that resolves nothing: every contract module is treated
// as a leaf (no dependencies). Enough for single-module compile tests.
const emptyGraph: ContractGraphContext = {
    resolve: async () => null,
    load: async () => null,
};

async function compileModule(source: string, id: string) {
    const compiler = createCompiler();
    const res = await compiler.consume(source, id, emptyGraph);
    return { compiler, res };
}

// Full CSS string as `produce()` returns it.
function cssOf(compiler: ReturnType<typeof createCompiler>): string {
    return compiler.produce();
}

describe('Compiler — className', () => {
    it('emits a class rule and strips the import', async () => {
        const source = `
            import { className } from '@css-zero/core';
            export const btn = className({ color: 'red', ':hover': { color: 'blue' } });
        `;
        const { compiler, res } = await compileModule(source, '/virtual/design.css.ts');

        expect(res.code).not.toContain('@css-zero/core');
        expect(res.code).not.toBeNull();
        expect(cssOf(compiler)).toContain('.o-s_1');
        expect(cssOf(compiler)).toContain('color:red;');
        expect(cssOf(compiler)).toContain(':hover{color:blue;}');
        // The value is substituted with the token string.
        expect(res.code).toContain('"o-s_1"');
    });
});

describe('Compiler — style', () => {
    it('style(config) without deps is a global chunk (deps: [])', async () => {
        const source = `
            import { style } from '@css-zero/core';
            style({ body: { margin: 0 } });
        `;
        const { compiler, res } = await compileModule(source, '/virtual/global.css.ts');

        expect(cssOf(compiler)).toContain('body{margin:0;}');
        // The bare call is removed from the code.
        expect(res.code).not.toContain('style(');
    });

    it('style(config, deps) produces a conditional AND chunk', async () => {
        const source = `
            import { className, style } from '@css-zero/core';
            export const a = className({ display: 'block' });
            style({ '.a > .b': { color: 'red' } }, [a]);
        `;
        const { compiler } = await compileModule(source, '/virtual/cond.css.ts');

        // The dep token is present in the build, so the conditional chunk is active.
        expect(cssOf(compiler)).toContain('.a > .b{color:red;}');
    });

    it('style(config, non-array deps) warns and blanks the call', async () => {
        const source = `
            import { style } from '@css-zero/core';
            style({ body: { margin: 0 } }, 'not-an-array');
        `;
        const { compiler, res } = await compileModule(source, '/virtual/bad.css.ts');

        expect(res.diagnostics.length).toBeGreaterThan(0);
        expect(res.diagnostics[0].severity).toBe('warn');
        expect(cssOf(compiler)).toBe('');
    });
});

describe('Compiler — variable', () => {
    it('returns [name, var(name)] and emits a @property chunk', async () => {
        const source = `
            import { variable } from '@css-zero/core';
            export const [brand, brandRef] = variable('#2b6cb0');
        `;
        const { compiler, res } = await compileModule(source, '/virtual/theme.css.ts');

        expect(res.code).toContain('["--o-v_1","var(--o-v_1)"]');
        expect(cssOf(compiler)).toContain('--o-v_1');
    });
});

describe('Compiler — variants', () => {
    it('emits modifier rules with a base selector', async () => {
        const source = `
            import { className, variants } from '@css-zero/core';
            export const btn = className({ display: 'inline-flex' });
            export const size = variants({ sm: { fontSize: '12px' }, lg: { fontSize: '18px' } }, btn);
        `;
        const { compiler, res } = await compileModule(source, '/virtual/btn.css.ts');

        expect(res.code).toContain('"sm"');
        expect(res.code).toContain('"lg"');
        expect(cssOf(compiler)).toContain('.o-s_1.o-s_2{font-size:12px;}');
    });

    it('accepts a token as base (no leading dot)', async () => {
        const source = `
            import { className, variants } from '@css-zero/core';
            export const btn = className({ display: 'inline-flex' });
            export const tone = variants({ primary: { color: '#fff' } }, btn);
        `;
        const { compiler } = await compileModule(source, '/virtual/btn-token.css.ts');

        // base is the raw token `o-s_1` → `.o-s_1.o-s_2`
        expect(cssOf(compiler)).toContain('.o-s_1.o-s_2{color:#fff;}');
    });

    it('accepts a selector as base (leading dot, not duplicated)', async () => {
        const source = `
            import { className, variants } from '@css-zero/core';
            export const btn = className({ display: 'inline-flex' });
            export const tone = variants({ primary: { color: '#fff' } }, '.o-s_1');
        `;
        const { compiler } = await compileModule(source, '/virtual/btn-sel.css.ts');

        // base already starts with `.` → the dot is not added twice.
        expect(cssOf(compiler)).toContain('.o-s_1.o-s_2{color:#fff;}');
        expect(cssOf(compiler)).not.toContain('..o-s_1');
    });
});

describe('Compiler — theme', () => {
    it('emits @property chunks and option class rules', async () => {
        const source = `
            import { theme } from '@css-zero/core';
            export const [tokens, themes] = theme(
                { accent: '#0af', spacing: '8px' },
                { dark: { accent: '#0f0' }, compact: { spacing: '4px' } }
            );
        `;
        const { compiler, res } = await compileModule(source, '/virtual/theme.css.ts');

        // Returns [varRefs, optionClasses].
        expect(res.code).toContain('var(--o-v_1)');
        expect(res.code).toContain('var(--o-v_2)');
        expect(res.code).toContain('"dark"');
        expect(res.code).toContain('"compact"');

        // Two @property chunks for the variables.
        const css = cssOf(compiler);
        expect(css).toContain('--o-v_1');
        expect(css).toContain('initial-value:#0af;');
        // Two option class rules overriding the subset.
        expect(css).toContain('--o-v_1:#0f0;');
        expect(css).toContain('--o-v_2:4px;');
    });

    it('warns when arguments are not static objects', async () => {
        const source = `
            import { theme } from '@css-zero/core';
            export const [tokens, themes] = theme({ accent: '#0af' }, 'nope');
        `;
        const { compiler, res } = await compileModule(source, '/virtual/theme-bad.css.ts');

        expect(res.diagnostics.length).toBeGreaterThan(0);
        expect(cssOf(compiler)).toBe('');
    });
});

describe('Compiler — idSelector / classSelector', () => {
    it('classSelector returns [name, .name]', async () => {
        const source = `
            import { classSelector } from '@css-zero/core';
            export const [name, sel] = classSelector({ color: 'green' });
        `;
        const { res } = await compileModule(source, '/virtual/cs.css.ts');

        expect(res.code).toContain('["o-s_1",".o-s_1"]');
    });

    it('idSelector returns [name, #name]', async () => {
        const source = `
            import { idSelector } from '@css-zero/core';
            export const [name, sel] = idSelector({ fontWeight: 700 });
        `;
        const { res } = await compileModule(source, '/virtual/is.css.ts');

        expect(res.code).toContain('["o-i_1","#o-i_1"]');
    });
});

describe('Compiler — contract module without graph', () => {
    it('adds a warning and leaves the source untouched', async () => {
        const source = `
            import { className } from '@css-zero/core';
            export const a = className({ color: 'red' });
        `;
        const compiler = createCompiler();
        const res = await compiler.consume(source, '/virtual/design.css.ts');

        expect(res.diagnostics.length).toBeGreaterThan(0);
        expect(res.code).toBeNull();
    });
});

describe('Compiler — renamed .css.js (bundler output)', () => {
    it('substitutes by captured results, independent of local renames', async () => {
        // Mirrors what a bundler emits for a contract module: local variables
        // are renamed and re-exported (`export { o as btn }`). Matching by name
        // would fail; matching by captured results works.
        const source = `
            import { className as t, variants as e } from "@css-zero/core";
            const o = t({ display: 'inline-flex' });
            const i = e({ sm: { fontSize: '12px' } }, o);
            export { o as btn, i as tone };
        `;
        const { compiler, res } = await compileModule(source, '/virtual/buttons.css.js');

        // The runtime import is stripped.
        expect(res.code).not.toContain('@css-zero/core');
        // Top-level calls are replaced with the captured values.
        expect(res.code).toContain('"o-s_1"');
        expect(res.code).toContain('"sm"');
        expect(res.code).toContain('"o-s_2"');
        // CSS was still emitted.
        expect(cssOf(compiler).length).toBeGreaterThan(0);
    });

    it('warns when a utility is called inside a function and leaves it unsubstituted', async () => {
        const source = `
            import { className } from '@css-zero/core';
            export function make() {
                return className({ color: 'red' });
            }
        `;
        const { res } = await compileModule(source, '/virtual/in-fn.css.ts');

        const warn = res.diagnostics.find((d) =>
            d.message.includes('inside a function')
        );
        expect(warn).toBeDefined();
        expect(warn!.severity).toBe('warn');
        // The call is not substituted.
        expect(res.code).toContain('className(');
    });
});

describe('Compiler — token generation', () => {
    it('generates deterministic monotonic tokens', async () => {
        const source = `
            import { className } from '@css-zero/core';
            export const a = className({ color: 'red' });
            export const b = className({ color: 'blue' });
        `;
        const { compiler, res } = await compileModule(source, '/virtual/tokens.css.ts');

        expect(res.code).toContain('"o-s_1"');
        expect(res.code).toContain('"o-s_2"');
        expect(cssOf(compiler)).toContain('.o-s_1');
        expect(cssOf(compiler)).toContain('.o-s_2');
    });

    it('defaults the prefix to "o"', async () => {
        const source = `
            import { className } from '@css-zero/core';
            export const a = className({ color: 'red' });
        `;
        const { compiler } = await compileModule(source, '/virtual/prefix.css.ts');

        expect(compiler.prefix).toBe('o');
        expect(cssOf(compiler)).toContain('.o-s_1');
    });
});

describe('Compiler — produce(code) (tree-shaking by chunk)', () => {
    it('emits only CSS whose token is present in the given code', async () => {
        const source = `
            import { className } from '@css-zero/core';
            export const used = className({ color: 'red' });
            export const dead = className({ color: 'blue' });
        `;
        const { compiler } = await compileModule(source, '/virtual/final.css.ts');

        // Only `used` token reaches the chunk code.
        const css = compiler.produce('"o-s_1"');
        expect(css).toContain('.o-s_1');
        expect(css).not.toContain('.o-s_2');
    });

    it('emits a complex chunk only when all its deps are in the code', async () => {
        const source = `
            import { className, style } from '@css-zero/core';
            export const a = className({ display: 'block' });
            export const b = className({ display: 'inline' });
            style({ '.a > .b': { color: 'red' } }, [a, b]);
        `;
        const { compiler } = await compileModule(source, '/virtual/cond.css.ts');

        // Both deps present → the conditional chunk is active.
        expect(compiler.produce('"o-s_1" "o-s_2"')).toContain(
            '.a > .b{color:red;}'
        );
        // Only one dep → the conditional chunk is dropped.
        expect(compiler.produce('"o-s_1"')).not.toContain('.a > .b');
    });
});