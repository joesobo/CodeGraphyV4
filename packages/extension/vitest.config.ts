import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const root = resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      resolve(__dirname, 'tests/**/*.test.{ts,tsx}'),
      resolve(root, 'packages/plugin-*/__tests__/**/*.test.{ts,tsx}'),
    ],
    setupFiles: [resolve(__dirname, 'tests/setup.ts')],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      vscode: resolve(__dirname, 'tests/__mocks__/vscode.ts'),
    },
  },
});
