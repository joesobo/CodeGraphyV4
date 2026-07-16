import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  test: {
    coverage: {
      exclude: ['src/**/*.d.ts', 'src/physics/wasm/assembly/**'],
      include: ['src/**/*.{ts,tsx}'],
    },
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: [resolve(import.meta.dirname, 'tests/setup.ts')],
  },
  resolve: {
    alias: {
      '@graph-renderer': resolve(import.meta.dirname, 'src'),
    },
  },
});
