import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cssZero } from '@css-zero/vite-plugin';

export default defineConfig({
    plugins: [react(), cssZero({ build: { inline: true } })],
});