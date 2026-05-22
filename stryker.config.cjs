const path = require('node:path');
const base = require('@poleski/quality-tools/stryker.config.cjs');

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
  ...base,
  packageManager: 'pnpm',
  vitest: {
    ...base.vitest,
    configFile: path.join(__dirname, 'packages/extension/vitest.config.ts'),
    dir: path.join(__dirname, 'packages/extension'),
    related: false,
  },
  reporters: [
    'progress',
    ...(base.reporters ?? []).filter((reporter) => reporter !== 'progress'),
  ],
  concurrency: numberFromEnv('CODEGRAPHY_STRYKER_CONCURRENCY', base.concurrency ?? 2),
  maxTestRunnerReuse: numberFromEnv('CODEGRAPHY_STRYKER_MAX_TEST_RUNNER_REUSE', base.maxTestRunnerReuse ?? 0),
  dryRunTimeoutMinutes: 30,
  ignorePatterns: [
    ...new Set([
      ...(base.ignorePatterns ?? []),
      '/.vscode-test',
      '/.vscode-test/**',
      '**/.vscode-test',
      '**/.vscode-test/**',
    ]),
  ],
};
