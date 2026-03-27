import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const workspaceRoot = resolve(__dirname, '../..');

export default defineConfig({
  root: workspaceRoot,
  test: {
    environment: 'node',
    include: ['packages/quality-tools/tests/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(workspaceRoot, 'coverage/quality-tools'),
      include: ['packages/quality-tools/src/**/*.ts'],
      exclude: ['packages/quality-tools/tests/**/*.ts']
    }
  }
});
