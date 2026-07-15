import { defineConfig } from '@playwright/test';

import {
  GRAPH_BENCHMARK_DEVICE_SCALE_FACTOR,
  GRAPH_BENCHMARK_VIEWPORT,
  graphBenchmarkChromiumArguments,
} from './src/harness/chromium';

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: false,
  retries: 0,
  timeout: 180_000,
  use: {
    deviceScaleFactor: GRAPH_BENCHMARK_DEVICE_SCALE_FACTOR,
    headless: true,
    launchOptions: {
      args: graphBenchmarkChromiumArguments(),
    },
    viewport: GRAPH_BENCHMARK_VIEWPORT,
  },
  workers: 1,
});
