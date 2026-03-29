import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const workspaceRoot = resolve(__dirname, '../..');
const scopedInclude = process.env.CODEGRAPHY_VITEST_INCLUDE_JSON
  ? JSON.parse(process.env.CODEGRAPHY_VITEST_INCLUDE_JSON) as string[]
  : undefined;

export default defineConfig({
  root: workspaceRoot,
  test: {
    environment: 'node',
    include: scopedInclude ?? ['packages/quality-tools/tests/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(workspaceRoot, 'coverage/quality-tools'),
      include: ['packages/quality-tools/src/**/*.ts'],
      exclude: ['packages/quality-tools/tests/**/*.ts']
    }
  }
});
