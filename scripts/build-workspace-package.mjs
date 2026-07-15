import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

if (args[0] === '--clean') {
  const outputDirectory = args[1];
  if (!outputDirectory) throw new Error('Usage: build-workspace-package.mjs --clean <directory>');
  rmSync(path.resolve(outputDirectory), { force: true, recursive: true });
  process.exit(0);
}

const [entryPoint, outfile, ...assetArgs] = args;

if (!entryPoint || !outfile) {
  throw new Error(
    'Usage: build-workspace-package.mjs <entry> <outfile> [--copy <source> <destination>]',
  );
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

for (let index = 0; index < assetArgs.length; index += 3) {
  const [flag, source, destination] = assetArgs.slice(index, index + 3);
  if (flag !== '--copy' || !source || !destination) {
    throw new Error('Assets must use --copy <source> <destination>');
  }
  mkdirSync(path.dirname(path.resolve(destination)), { recursive: true });
  copyFileSync(path.resolve(source), path.resolve(destination));
}
