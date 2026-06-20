import { defineConfig } from '@playwright/test';

type PlaywrightEnvironment = Partial<Pick<
  NodeJS.ProcessEnv,
  | 'CI'
  | 'CODEGRAPHY_VSCODE_PLAYWRIGHT_GREP'
  | 'CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE'
  | 'CODEGRAPHY_VSCODE_PLAYWRIGHT_WORKERS'
>>;

const languageExamplePattern = /\bExample\b/i;

export function resolvePlaywrightGrep(environment: PlaywrightEnvironment = process.env): RegExp | undefined {
  if (environment.CODEGRAPHY_VSCODE_PLAYWRIGHT_GREP) {
    return new RegExp(environment.CODEGRAPHY_VSCODE_PLAYWRIGHT_GREP, 'i');
  }

  if ((environment.CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE ?? 'all') === 'examples') {
    return languageExamplePattern;
  }

  return undefined;
}

export function resolvePlaywrightGrepInvert(environment: PlaywrightEnvironment = process.env): RegExp | undefined {
  return (environment.CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE ?? 'all') === 'interactions'
    ? languageExamplePattern
    : undefined;
}

export function resolvePlaywrightWorkerCount(environment: PlaywrightEnvironment = process.env): number {
  return Number(environment.CODEGRAPHY_VSCODE_PLAYWRIGHT_WORKERS ?? 1);
}

const suite = process.env.CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE ?? 'all';
const workerCount = resolvePlaywrightWorkerCount();

export default defineConfig({
  testDir: './tests/playwright-vscode',
  timeout: 120_000,
  fullyParallel: workerCount > 1,
  forbidOnly: Boolean(process.env.CI),
  grep: resolvePlaywrightGrep(),
  grepInvert: resolvePlaywrightGrepInvert(),
  retries: process.env.CI ? 2 : 0,
  workers: workerCount,
  outputDir: `../../test-results/vscode-playwright/${suite}`,
  reporter: [['list'], ['html', { outputFolder: `../../playwright-report/vscode/${suite}`, open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
