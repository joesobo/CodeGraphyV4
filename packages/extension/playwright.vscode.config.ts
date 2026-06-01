import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright-vscode',
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  outputDir: '../../test-results/vscode-playwright',
  reporter: [['list'], ['html', { outputFolder: '../../playwright-report/vscode', open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
