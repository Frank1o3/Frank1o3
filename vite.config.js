// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/Frank1o3/',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/index.html'),
            },
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    // Ensure PostCSS config is loaded for Tailwind v4
    css: {
        postcss: './postcss.config.js'
    }
});