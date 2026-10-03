import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: [
                'src/buttons.css.ts',
                'src/indents.css.ts',
                'src/vars.css.ts',
            ],
            formats: ['es'],
            fileName: (_format, entryName) =>
                `${entryName.replace(/\.css$/, '')}.css.js`,
        },
        rollupOptions: {
            external: ['@css-zero/core'],
        },
        // Minify the emitted `.css.js` chunks with terser.
        // The `.css.js` marker extension is preserved, and `@css-zero/core` stays
        // external (the consumer compiler resolves the tokens when executing the graph).
        minify: 'terser',
        terserOptions: {
            module: true,
        },
        sourcemap: false,
        emptyOutDir: true,
        target: 'es2020',
    },
});
