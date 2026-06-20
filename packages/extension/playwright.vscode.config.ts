import { defineConfig } from '@playwright/test';

const suite = process.env.CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE ?? 'all';
const languageExamplePattern = /example renders expected/i;
const workerCount = Number(process.env.CODEGRAPHY_VSCODE_PLAYWRIGHT_WORKERS ?? 1);

export default defineConfig({
  testDir: './tests/playwright-vscode',
  timeout: 120_000,
  fullyParallel: workerCount > 1,
  forbidOnly: Boolean(process.env.CI),
  grep: suite === 'examples' ? languageExamplePattern : undefined,
  grepInvert: suite === 'interactions' ? languageExamplePattern : undefined,
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
