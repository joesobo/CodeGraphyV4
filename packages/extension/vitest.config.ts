import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import {
  extensionNodeTestIncludes,
  resolveExtensionWebviewTestIncludes,
  resolveMutationVitestIncludes,
} from './vitest.includes';

const workspaceRoot = resolve(__dirname, '../..');
const extensionNodeModules = resolve(__dirname, 'node_modules');
const vitestScope = process.env.CODEGRAPHY_VITEST_SCOPE ?? 'extension';
const useMutationCompatibleConfig =
  Boolean(process.env.CODEGRAPHY_VITEST_INCLUDE_JSON)
    || Boolean(process.env.QUALITY_TOOLS_VITEST_INCLUDE_JSON)
    || vitestScope === 'workspace';
const coverageReportKey = vitestScope === 'workspace' ? 'workspace' : 'extension';
const coverageInclude = vitestScope === 'workspace'
  ? ['packages/*/src/**/*.{ts,tsx}']
  : ['packages/extension/src/**/*.{ts,tsx}'];
const coverageExclude = vitestScope === 'workspace'
  ? ['packages/*/src/**/*.d.ts']
  : ['packages/extension/src/**/*.d.ts'];
const webviewSetupFiles = [resolve(__dirname, 'tests/setup.ts')];

export default defineConfig({
  root: workspaceRoot,
  plugins: [react()],
  test: {
    globals: true,
    server: {
      sourcemap: false,
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(workspaceRoot, 'reports/quality-tools/crap', coverageReportKey),
      include: coverageInclude,
      exclude: coverageExclude,
    },
    ...(useMutationCompatibleConfig
      ? {
          environment: 'jsdom',
          include: resolveMutationVitestIncludes(process.env),
          setupFiles: webviewSetupFiles,
        }
      : {
          projects: [
            {
              extends: true,
              test: {
                name: 'node',
                environment: 'node',
                include: extensionNodeTestIncludes,
              },
            },
            {
              extends: true,
              test: {
                name: 'webview',
                environment: 'jsdom',
                include: resolveExtensionWebviewTestIncludes(process.env),
                setupFiles: webviewSetupFiles,
              },
            },
          ],
        }),
  },
  resolve: {
    alias: {
      '@codegraphy-dev/core': resolve(__dirname, '../core/src/index.ts'),
      '@codegraphy-dev/plugin-markdown': resolve(__dirname, '../plugin-markdown/src/plugin.ts'),
      '@': resolve(__dirname, 'src'),
      react: resolve(extensionNodeModules, 'react'),
      'react-dom': resolve(extensionNodeModules, 'react-dom'),
      vscode: resolve(__dirname, 'tests/__mocks__/vscode.ts'),
    },
  },
});
