import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const workspaceRoot = resolve(__dirname, '../..');

export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [react()],
  build: {
    assetsInlineLimit: 0,
    outDir: resolve(workspaceRoot, 'dist/webview'),
    rollupOptions: {
      input: resolve(__dirname, 'src/webview/main.tsx'),
      output: {
        entryFileNames: 'index.js',
        assetFileNames: 'index.[ext]',
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
