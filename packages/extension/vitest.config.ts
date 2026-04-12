import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { extensionOwnedVitestIncludes } from './vitest.includes';

const root = resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    fileParallelism: false,
    server: {
      sourcemap: false,
    },
    include: extensionOwnedVitestIncludes,
    setupFiles: [resolve(__dirname, 'tests/setup.ts')],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(root, 'coverage'),
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', '../*/src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      vscode: resolve(__dirname, 'tests/__mocks__/vscode.ts'),
    },
  },
});
