// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/Frank1o3/',
    // root defaults to project root — no need to set it
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'), // Now in root
            },
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    css: {
        postcss: './postcss.config.js'
    }
});