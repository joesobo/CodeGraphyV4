import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const workspaceRoot = resolve(__dirname, '../..');

export default defineConfig({
  root: workspaceRoot,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    server: {
      sourcemap: false,
    },
    include: [
      'packages/*/tests/**/*.test.{ts,tsx}',
      'packages/*/__tests__/**/*.test.{ts,tsx}',
    ],
    setupFiles: [resolve(__dirname, 'tests/setup.ts')],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(workspaceRoot, 'coverage'),
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: ['packages/*/src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      vscode: resolve(__dirname, 'tests/__mocks__/vscode.ts'),
    },
  },
});
