import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const [entryPoint, outfile] = process.argv.slice(2);

if (!entryPoint || !outfile) {
  throw new Error('Usage: node ../../scripts/build-workspace-package.mjs <entry> <outfile>');
}

const packageJson = JSON.parse(readFileSync(path.resolve('package.json'), 'utf8'));
const external = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
  ...Object.keys(packageJson.optionalDependencies ?? {}),
];

await build({
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external,
});
