import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const vendoredSQLitePath = path.join(repoRoot, 'dist', 'node_modules', 'libsql');

try {
  const Database = require(vendoredSQLitePath);
  const database = new Database(':memory:');
  database.exec('CREATE TABLE RuntimeCheck(value TEXT NOT NULL)');
  database.prepare('INSERT INTO RuntimeCheck(value) VALUES (?)').run('ready');
  const row = database.prepare('SELECT value FROM RuntimeCheck').get();
  database.close();
  if (row?.value !== 'ready') {
    throw new Error('SQLite query round-trip returned an unexpected value.');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(
    `Unable to load vendored SQLite native runtime from ${vendoredSQLitePath}: ${message}`,
  );
}

console.log(`Loaded vendored SQLite native runtime from ${vendoredSQLitePath}`);
