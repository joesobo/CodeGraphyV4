import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const workspaceRoot = resolve(__dirname, '../..');
const extensionNodeModules = resolve(__dirname, 'node_modules');

export default defineConfig({
  root: workspaceRoot,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    server: {
      sourcemap: false,
    },
    include: ['packages/extension/tests/**/*.test.{ts,tsx}'],
    setupFiles: [resolve(__dirname, 'tests/setup.ts')],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(workspaceRoot, 'reports/quality-tools/crap/extension'),
      include: ['packages/extension/src/**/*.{ts,tsx}'],
      exclude: ['packages/extension/src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@codegraphy/core': resolve(__dirname, '../core/src/index.ts'),
      '@codegraphy/plugin-markdown': resolve(__dirname, '../plugin-markdown/src/plugin.ts'),
      '@': resolve(__dirname, 'src'),
      react: resolve(extensionNodeModules, 'react'),
      'react-dom': resolve(extensionNodeModules, 'react-dom'),
      vscode: resolve(__dirname, 'tests/__mocks__/vscode.ts'),
    },
  },
});
