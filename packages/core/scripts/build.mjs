import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const external = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
  ...Object.keys(packageJson.optionalDependencies ?? {}),
];

const sharedOptions = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external,
};

await Promise.all([
  build({
    ...sharedOptions,
    entryPoints: ['src/index.ts'],
    outfile: 'dist/index.js',
  }),
  build({
    ...sharedOptions,
    entryPoints: ['src/cli/main.ts'],
    outfile: 'dist/cli/main.js',
    banner: {
      js: '#!/usr/bin/env node',
    },
  }),
  build({
    ...sharedOptions,
    entryPoints: ['src/graphScope/defaults.ts'],
    outfile: 'dist/graphScope/defaults.js',
  }),
  build({
    ...sharedOptions,
    entryPoints: ['src/fileColors.ts'],
    outfile: 'dist/fileColors.js',
  }),
]);
