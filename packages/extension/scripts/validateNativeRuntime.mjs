import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
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

  const runtimeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-native-runtime-'));
  try {
    const databasePath = path.join(runtimeDirectory, 'graph.sqlite');
    const writeCache = (value) => {
      const diskDatabase = new Database(databasePath);
      diskDatabase.exec('CREATE TABLE IF NOT EXISTS RuntimeCheck(value TEXT NOT NULL)');
      diskDatabase.exec('BEGIN TRANSACTION');
      try {
        diskDatabase.exec('DELETE FROM RuntimeCheck');
        diskDatabase.prepare('INSERT INTO RuntimeCheck(value) VALUES (?)').run(value);
        diskDatabase.exec('COMMIT');
      } catch (error) {
        diskDatabase.exec('ROLLBACK');
        throw error;
      } finally {
        diskDatabase.close();
      }
    };
    const readCache = () => {
      const diskDatabase = new Database(databasePath);
      try {
        return diskDatabase.prepare('SELECT value FROM RuntimeCheck').get()?.value;
      } finally {
        diskDatabase.close();
      }
    };

    writeCache('first');
    if (readCache() !== 'first') {
      throw new Error('SQLite disk round-trip returned an unexpected first value.');
    }
    writeCache('second');
    if (readCache() !== 'second') {
      throw new Error('SQLite repeated disk save returned an unexpected second value.');
    }

    fs.truncateSync(databasePath, 0);
    writeCache('reinitialized');
    if (readCache() !== 'reinitialized') {
      throw new Error('SQLite in-place cache reinitialization returned an unexpected value.');
    }
  } finally {
    try {
      fs.rmSync(runtimeDirectory, { force: true, recursive: true });
    } catch {
      // Windows can retain native statement handles until garbage collection.
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(
    `Unable to load vendored SQLite native runtime from ${vendoredSQLitePath}: ${message}`,
  );
}

console.log(`Loaded vendored SQLite native runtime from ${vendoredSQLitePath}`);
