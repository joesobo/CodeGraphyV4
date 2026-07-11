import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const explicitTestIncludes = process.env.QUALITY_TOOLS_VITEST_INCLUDE_JSON
  ?? process.env.CODEGRAPHY_VITEST_INCLUDE_JSON;

function packageRelativeInclude(includePattern: string): string {
  const negated = includePattern.startsWith('!');
  const pattern = negated ? includePattern.slice(1) : includePattern;
  const packagePrefix = 'packages/core/';
  const relativePattern = pattern.startsWith(packagePrefix)
    ? pattern.slice(packagePrefix.length)
    : pattern;

  return negated ? `!${relativePattern}` : relativePattern;
}

function resolveTestIncludes(): string[] {
  if (!explicitTestIncludes) {
    return ['tests/**/*.test.ts'];
  }

  return (JSON.parse(explicitTestIncludes) as string[]).map(packageRelativeInclude);
}

export default defineConfig({
  resolve: {
    alias: {
      '@codegraphy-dev/plugin-api': resolve(__dirname, '../plugin-api/src/index.ts'),
      '@codegraphy-dev/plugin-markdown': resolve(__dirname, '../plugin-markdown/src/plugin.ts'),
      '@codegraphy-dev/plugin-material-icons': resolve(__dirname, '../plugin-material-icons/src/plugin.ts'),
    },
  },
  test: {
    environment: 'node',
    include: resolveTestIncludes(),
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(__dirname, '../../coverage/core'),
      include: ['src/**/*.ts'],
      exclude: ['tests/**/*.ts'],
    },
  },
});
