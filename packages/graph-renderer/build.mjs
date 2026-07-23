import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(packageRoot, 'dist');
const loaderPath = path.join(packageRoot, 'src/physics/wasm/runtime/loader.ts');

rmSync(distRoot, { force: true, recursive: true });

execFileSync(
  process.execPath,
  [require.resolve('tsx/cli'), 'scripts/buildPhysics.ts'],
  { cwd: packageRoot, stdio: 'inherit' },
);
execFileSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json'],
  { cwd: packageRoot, stdio: 'inherit' },
);

await build({
  entryPoints: [path.join(packageRoot, 'src/index.ts')],
  outfile: path.join(distRoot, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  plugins: [{
    name: 'published-wasm-path',
    setup(buildContext) {
      buildContext.onLoad({ filter: /loader\.ts$/ }, ({ path: sourcePath }) => {
        if (sourcePath !== loaderPath) return undefined;
        const contents = readFileSync(sourcePath, 'utf8');
        if (!contents.includes('../generated/physics.wasm')) {
          throw new Error('Graph physics loader does not contain the development WASM path.');
        }
        return {
          contents: contents.replaceAll(
            '../generated/physics.wasm',
            './generated/physics.wasm',
          ),
          loader: 'ts',
        };
      });
    },
  }],
  sourcemap: true,
  target: 'node22',
});

const generatedDistRoot = path.join(distRoot, 'generated');
mkdirSync(generatedDistRoot, { recursive: true });
copyFileSync(
  path.join(packageRoot, 'src/physics/wasm/generated/physics.wasm'),
  path.join(generatedDistRoot, 'physics.wasm'),
);
