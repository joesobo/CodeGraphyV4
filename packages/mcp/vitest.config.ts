import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@codegraphy-dev/core': resolve(__dirname, '../core/src/index.ts'),
      '@codegraphy-dev/plugin-markdown': resolve(__dirname, '../plugin-markdown/src/plugin.ts'),
      '@codegraphy-dev/plugin-material-icons': resolve(__dirname, '../plugin-material-icons/src/plugin.ts'),
      '@codegraphy-dev/plugin-api': resolve(__dirname, '../plugin-api/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(__dirname, '../../coverage/mcp'),
      include: ['src/**/*.ts'],
      exclude: ['tests/**/*.ts'],
    },
  },
});
