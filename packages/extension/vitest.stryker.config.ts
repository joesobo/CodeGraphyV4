import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const workspaceRoot = resolve(__dirname, '../..');
const vitestScope = process.env.CODEGRAPHY_VITEST_SCOPE ?? 'extension';
const scopedInclude = process.env.CODEGRAPHY_VITEST_INCLUDE_JSON
  ? JSON.parse(process.env.CODEGRAPHY_VITEST_INCLUDE_JSON) as string[]
  : undefined;
const defaultInclude = vitestScope === 'workspace'
  ? [
      'packages/*/tests/**/*.test.{ts,tsx}',
      'packages/*/__tests__/**/*.test.{ts,tsx}',
    ]
  : [
      'packages/extension/tests/**/*.test.{ts,tsx}',
      'packages/extension/__tests__/**/*.test.{ts,tsx}',
    ];
const coverageInclude = vitestScope === 'workspace'
  ? ['packages/*/src/**/*.{ts,tsx}']
  : ['packages/extension/src/**/*.{ts,tsx}'];
const coverageExclude = vitestScope === 'workspace'
  ? ['packages/*/src/**/*.d.ts']
  : ['packages/extension/src/**/*.d.ts'];

export default defineConfig({
  root: workspaceRoot,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    server: {
      sourcemap: false,
    },
    include: scopedInclude ?? defaultInclude,
    setupFiles: [resolve(__dirname, 'tests/setup.ts')],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(workspaceRoot, 'coverage'),
      include: coverageInclude,
      exclude: coverageExclude,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      vscode: resolve(__dirname, 'tests/__mocks__/vscode.ts'),
    },
  },
});
