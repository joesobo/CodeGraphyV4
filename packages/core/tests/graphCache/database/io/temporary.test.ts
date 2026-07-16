import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanupTemporaryDatabase,
  replaceDatabaseCache,
} from '../../../../src/graphCache/database/io/temporary';

let testDirectory: string | undefined;

function createTestDirectory(): string {
  testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-temp-db-'));
  return testDirectory;
}

function writeFile(filePath: string, contents: string): void {
  fs.writeFileSync(filePath, contents, 'utf8');
}

afterEach(() => {
  if (testDirectory) {
    fs.rmSync(testDirectory, { force: true, recursive: true });
    testDirectory = undefined;
  }
});

describe('graphCache/database/io/temporary', () => {
  it('cleans up temporary database sidecar files', () => {
    const directory = createTestDirectory();
    const tempDatabasePath = path.join(directory, 'graph.sqlite.123.tmp');
    writeFile(tempDatabasePath, 'temp database');
    writeFile(`${tempDatabasePath}-wal`, 'temp wal');
    writeFile(`${tempDatabasePath}-shm`, 'temp shm');

    cleanupTemporaryDatabase(tempDatabasePath);

    expect(fs.existsSync(tempDatabasePath)).toBe(false);
    expect(fs.existsSync(`${tempDatabasePath}-wal`)).toBe(false);
    expect(fs.existsSync(`${tempDatabasePath}-shm`)).toBe(false);
  });

  it('replaces database sidecar files with temporary sidecars', () => {
    const directory = createTestDirectory();
    const databasePath = path.join(directory, 'graph.sqlite');
    const tempDatabasePath = path.join(directory, 'graph.sqlite.123.tmp');
    writeFile(databasePath, 'old database');
    writeFile(`${databasePath}-wal`, 'old wal');
    writeFile(tempDatabasePath, 'new database');
    writeFile(`${tempDatabasePath}-wal`, 'new wal');

    replaceDatabaseCache(tempDatabasePath, databasePath);

    expect(fs.readFileSync(databasePath, 'utf8')).toBe('new database');
    expect(fs.readFileSync(`${databasePath}-wal`, 'utf8')).toBe('new wal');
    expect(fs.existsSync(tempDatabasePath)).toBe(false);
    expect(fs.existsSync(`${tempDatabasePath}-wal`)).toBe(false);
  });
});
