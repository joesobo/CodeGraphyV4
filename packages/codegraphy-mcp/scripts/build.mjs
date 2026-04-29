import { build } from 'esbuild';

await build({
  entryPoints: ['src/cli/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  banner: {
    js: '#!/usr/bin/env node',
  },
});
