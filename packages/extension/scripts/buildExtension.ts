import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import {
  EXTENSION_EXTERNAL_PACKAGE_NAMES,
  syncExtensionRuntimePackages,
} from './externalPackages';

const scriptDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const outputFilePath = path.resolve(scriptDirectoryPath, '../../../dist/extension.js');
const outputDirectoryPath = path.dirname(outputFilePath);

const buildOptions: esbuild.BuildOptions = {
  entryPoints: {
    extension: path.resolve(scriptDirectoryPath, '../src/extension/activate.ts'),
    treeSitterColdWorker: path.resolve(
      scriptDirectoryPath,
      '../../core/src/treeSitter/runtime/coldAnalysis/treeSitterColdWorker.ts',
    ),
  },
  bundle: true,
  outdir: outputDirectoryPath,
  external: [...EXTENSION_EXTERNAL_PACKAGE_NAMES],
  define: { 'import.meta.url': 'undefined' },
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
