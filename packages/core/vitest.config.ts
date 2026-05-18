import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@codegraphy/plugin-api': resolve(__dirname, '../plugin-api/src/index.ts'),
      '@codegraphy/plugin-markdown': resolve(__dirname, '../plugin-markdown/src/plugin.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(__dirname, '../../coverage/core'),
      include: ['src/**/*.ts'],
      exclude: ['tests/**/*.ts'],
    },
  },
});
