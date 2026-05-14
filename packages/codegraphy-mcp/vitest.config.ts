import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@codegraphy/core': resolve(__dirname, '../core/src/index.ts'),
      '@codegraphy/plugin-api': resolve(__dirname, '../plugin-api/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(__dirname, '../../coverage/codegraphy-mcp'),
      include: ['src/**/*.ts'],
      exclude: ['tests/**/*.ts'],
    },
  },
});
