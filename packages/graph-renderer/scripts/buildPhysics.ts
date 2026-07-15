import { watch } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const packageRoot = resolve(import.meta.dirname, '..');
const sourceDirectory = resolve(packageRoot, 'wasm/physics/assembly');
const defaultOutputFile = resolve(packageRoot, 'src/wasm/generated/physics.wasm');

export async function buildGraphPhysics(outputFile = defaultOutputFile): Promise<void> {
  const { default: asc } = await import('assemblyscript/asc');
  await mkdir(dirname(outputFile), { recursive: true });
  const result = await asc.main([
    resolve(sourceDirectory, 'index.ts'),
    '--outFile',
    outputFile,
    '--runtime',
    'stub',
    '--importMemory',
    '--initialMemory',
    '1',
    '--maximumMemory',
    '32768',
    '--optimize',
    '--noAssert',
  ]);
  if (result.error) throw result.error;
}

function watchGraphPhysics(outputFile: string): void {
  let rebuilding = false;
  let pending = false;
  const rebuild = async (): Promise<void> => {
    if (rebuilding) {
      pending = true;
      return;
    }
    rebuilding = true;
    try {
      await buildGraphPhysics(outputFile);
      console.log('Rebuilt graph WASM physics');
    } catch (error) {
      console.error(error);
    } finally {
      rebuilding = false;
      if (pending) {
        pending = false;
        void rebuild();
      }
    }
  };
  watch(sourceDirectory, { recursive: true }, (_event, fileName) => {
    if (fileName?.endsWith('.ts')) void rebuild();
  });
  console.log('Watching graph WASM physics');
}

async function main(): Promise<void> {
  const outputOption = process.argv.indexOf('--output');
  const outputPath = outputOption === -1 ? undefined : process.argv[outputOption + 1];
  if (outputOption !== -1 && !outputPath) {
    throw new Error('--output requires a file path');
  }
  const outputFile = outputPath
    ? resolve(packageRoot, outputPath)
    : defaultOutputFile;
  if (process.argv.includes('--watch')) {
    await buildGraphPhysics(outputFile);
    watchGraphPhysics(outputFile);
    return;
  }
  await buildGraphPhysics(outputFile);
}

if (process.argv[1]?.endsWith('buildPhysics.ts')) {
  void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
