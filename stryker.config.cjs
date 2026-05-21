process.env.CODEGRAPHY_VITEST_SCOPE = process.env.CODEGRAPHY_VITEST_SCOPE ?? 'workspace';

function numberFromEnv(name, fallback) {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) && parsedValue >= 0
    ? parsedValue
    : fallback;
}

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
  concurrency: numberFromEnv('CODEGRAPHY_STRYKER_CONCURRENCY', 2),
  coverageAnalysis: 'perTest',
  maxTestRunnerReuse: numberFromEnv('CODEGRAPHY_STRYKER_MAX_TEST_RUNNER_REUSE', 0),
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
    '**/.vscode-test',
    '**/.vscode-test/**',
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
