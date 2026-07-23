import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);

execFileSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json'],
  { stdio: 'inherit' },
);

await Promise.all([
  build({
    entryPoints: ['src/plugin.ts'],
    outfile: 'dist/plugin.js',
    bundle: true,
    external: ['esbuild'],
    format: 'esm',
    platform: 'node',
    sourcemap: true,
    target: 'node20',
  }),
  build({
    entryPoints: {
      effects: 'src/effects.ts',
      webview: 'src/webview.tsx',
    },
    outdir: 'dist',
    bundle: true,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    target: 'es2020',
  }),
]);
