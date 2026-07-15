import { defineConfig } from '@playwright/test';

import { graphBenchmarkChromiumArguments } from './src/harness/chromium';

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: false,
  retries: 0,
  timeout: 180_000,
  use: {
    headless: true,
    launchOptions: {
      args: graphBenchmarkChromiumArguments(),
    },
    viewport: { width: 1280, height: 720 },
  },
  workers: 1,
});
