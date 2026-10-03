import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { cssZero } from '@css-zero/vite-plugin';

export default defineConfig({
    plugins: [svelte(), cssZero()],
});