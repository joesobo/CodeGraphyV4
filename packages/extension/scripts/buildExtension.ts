import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { syncExtensionRuntimePackages } from './runtimePackages';

const scriptDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const outputFilePath = path.resolve(scriptDirectoryPath, '../../../dist/extension.js');

const buildOptions: esbuild.BuildOptions = {
  entryPoints: [path.resolve(scriptDirectoryPath, '../src/extension/activate.ts')],
  bundle: true,
  outfile: outputFilePath,
  external: [
    'vscode',
    '@ladybugdb/core',
    'tree-sitter',
    'tree-sitter-javascript',
    'tree-sitter-typescript',
  ],
  format: 'cjs',
  platform: 'node',
};

function syncRuntimePackages(): void {
  syncExtensionRuntimePackages(outputFilePath);
}

async function buildExtension(): Promise<void> {
  await esbuild.build(buildOptions);
  syncRuntimePackages();
}

async function watchExtension(): Promise<void> {
  const context = await esbuild.context({
    ...buildOptions,
    plugins: [{
      name: 'sync-runtime-packages',
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) {
            syncRuntimePackages();
          }
        });
      },
    }],
  });

  await context.watch();
  syncRuntimePackages();
}

async function main(): Promise<void> {
  const watchMode = process.argv.includes('--watch');

  if (watchMode) {
    await watchExtension();
    return;
  }

  await buildExtension();
}

void main();
