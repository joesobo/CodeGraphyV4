import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const vendoredSQLitePath = path.join(repoRoot, 'dist', 'node_modules', 'better-sqlite3');

try {
  require(vendoredSQLitePath);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(
    `Unable to load vendored SQLite native runtime from ${vendoredSQLitePath}: ${message}`,
  );
}

console.log(`Loaded vendored SQLite native runtime from ${vendoredSQLitePath}`);
