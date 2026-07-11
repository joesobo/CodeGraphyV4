import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@codegraphy-dev/core': resolve(__dirname, '../packages/core/src/index.ts'),
      '@codegraphy-dev/plugin-api': resolve(
        __dirname,
        '../packages/plugin-api/src/index.ts',
      ),
      '@codegraphy-dev/plugin-markdown': resolve(
        __dirname,
        '../packages/plugin-markdown/src/plugin.ts',
      ),
      '@codegraphy-dev/plugin-material-icons': resolve(
        __dirname,
        '../packages/plugin-material-icons/src/plugin.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(__dirname, '../reports/quality-tools/crap/perf'),
      include: ['**/*.ts'],
      exclude: ['**/*.test.ts'],
    },
  },
});
