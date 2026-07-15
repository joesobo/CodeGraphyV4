import { watch } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageRoot = resolve(import.meta.dirname, '..');
const sourceDirectory = resolve(packageRoot, 'wasm/physics/assembly');
const outputDirectory = resolve(packageRoot, 'src/wasm/generated');

export async function buildGraphPhysics(): Promise<void> {
  const { default: asc } = await import('assemblyscript/asc');
  await mkdir(outputDirectory, { recursive: true });
  const result = await asc.main([
    resolve(sourceDirectory, 'index.ts'),
    '--outFile',
    resolve(outputDirectory, 'physics.wasm'),
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

function watchGraphPhysics(): void {
  let rebuilding = false;
  let pending = false;
  const rebuild = async (): Promise<void> => {
    if (rebuilding) {
      pending = true;
      return;
    }
    rebuilding = true;
    try {
      await buildGraphPhysics();
      console.log('Rebuilt owned graph WASM physics');
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
  console.log('Watching owned graph WASM physics');
}

async function main(): Promise<void> {
  if (process.argv.includes('--watch-only')) {
    watchGraphPhysics();
    return;
  }
  await buildGraphPhysics();
}

if (process.argv[1]?.endsWith('buildPhysics.ts')) {
  void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
