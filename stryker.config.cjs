process.env.CODEGRAPHY_VITEST_SCOPE = process.env.CODEGRAPHY_VITEST_SCOPE ?? 'workspace';

module.exports = {
  $schema: 'https://raw.githubusercontent.com/stryker-mutator/stryker-js/master/packages/core/schema/stryker-core.schema.json',
  packageManager: 'pnpm',
  testRunner: 'codegraphy-vitest',
  plugins: [
    './packages/quality-tools/stryker/codegraphy-vitest-runner.mjs',
    '@stryker-mutator/vitest-runner',
  ],
  vitest: {
    configFile: 'packages/extension/vitest.config.ts',
    related: false,
  },
  reporters: [
    'clear-text',
    'json',
    'html',
  ],
  jsonReporter: {
    fileName: 'reports/mutation/mutation.json',
  },
  htmlReporter: {
    fileName: 'reports/mutation/mutation.html',
  },
  concurrency: 1,
  coverageAnalysis: 'perTest',
  maxTestRunnerReuse: 1,
  testRunnerNodeArgs: [
    '--max-old-space-size=8192',
  ],
  dryRunTimeoutMinutes: 30,
  incremental: true,
  incrementalFile: 'reports/mutation/stryker-incremental.json',
  ignorePatterns: [
    '/coverage',
    '/.vscode-test',
    '/.vscode-test/**',
    '/.stryker-tmp',
    '/.stryker-tmp/**',
  ],
  ignoreStatic: true,
  thresholds: {
    high: 90,
    low: 80,
    break: null,
  },
};
