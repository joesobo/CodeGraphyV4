import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const vendoredCorePath = path.join(repoRoot, 'dist', 'node_modules', '@ladybugdb', 'core');

try {
  require(vendoredCorePath);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(
    `Unable to load vendored LadybugDB native runtime from ${vendoredCorePath}: ${message}`,
  );
}

console.log(`Loaded vendored LadybugDB native runtime from ${vendoredCorePath}`);
