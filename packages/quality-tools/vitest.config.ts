import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: resolve(__dirname, '../../coverage/quality-tools'),
      include: ['src/**/*.ts'],
      exclude: ['tests/**/*.ts']
    }
  }
});
