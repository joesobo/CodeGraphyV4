import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: false,
  retries: 0,
  timeout: 180_000,
  use: {
    headless: true,
    launchOptions: {
      args: [
        '--enable-unsafe-webgpu',
        ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []),
      ],
    },
    viewport: { width: 1280, height: 720 },
  },
  workers: 1,
});
