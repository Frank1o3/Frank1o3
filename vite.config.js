// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/Frank1o3/',
    // root stays default (project root) since index.html is here
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
            },
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    // Ensure PostCSS config is loaded
    css: {
        postcss: './postcss.config.js'
    }
});