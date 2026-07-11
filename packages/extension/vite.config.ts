import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const workspaceRoot = resolve(__dirname, '../..');

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  build: {
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
      '@codegraphy-dev/plugin-material-icons': resolve(__dirname, '../plugin-material-icons/src/plugin.ts'),
      '@': resolve(__dirname, 'src'),
    },
  },
});
