import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  test: {
    environment: 'node',
    include: ['fixtures/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(__dirname, '../reports/quality-tools/crap/perf'),
      include: ['fixtures/**/*.ts'],
      exclude: ['fixtures/**/*.test.ts'],
    },
  },
});
