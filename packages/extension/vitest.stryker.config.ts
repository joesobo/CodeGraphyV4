import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const workspaceRoot = resolve(__dirname, '../..');
const scopedInclude = process.env.CODEGRAPHY_VITEST_INCLUDE_JSON
  ? JSON.parse(process.env.CODEGRAPHY_VITEST_INCLUDE_JSON) as string[]
  : undefined;

export default defineConfig({
  root: workspaceRoot,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    server: {
      sourcemap: false,
    },
    include: scopedInclude ?? [
      'packages/extension/tests/**/*.test.{ts,tsx}',
      'packages/extension/__tests__/**/*.test.{ts,tsx}',
    ],
    setupFiles: [resolve(__dirname, 'tests/setup.ts')],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(workspaceRoot, 'coverage'),
      include: ['packages/extension/src/**/*.{ts,tsx}'],
      exclude: ['packages/extension/src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      vscode: resolve(__dirname, 'tests/__mocks__/vscode.ts'),
    },
  },
});
