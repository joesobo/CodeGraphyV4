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

  it('replaces an existing database when Windows rejects rename over a target', () => {
    const directory = createTestDirectory();
    const databasePath = path.join(directory, 'graph.sqlite');
    const tempDatabasePath = path.join(directory, 'graph.sqlite.123.tmp');
    writeFile(databasePath, 'old database');
    writeFile(tempDatabasePath, 'new database');
    replaceDatabaseCache(tempDatabasePath, databasePath, {
      existsSync: fs.existsSync,
      renameSync(sourcePath, targetPath) {
        if (sourcePath === tempDatabasePath && targetPath === databasePath && fs.existsSync(databasePath)) {
          const error = new Error('Windows cannot rename over an existing target') as NodeJS.ErrnoException;
          error.code = 'EPERM';
          throw error;
        }
        fs.renameSync(sourcePath, targetPath);
      },
      rmSync: fs.rmSync,
    });

    expect(fs.readFileSync(databasePath, 'utf8')).toBe('new database');
    expect(fs.existsSync(tempDatabasePath)).toBe(false);
  });

  it('restores the previous database when promoting the replacement fails', () => {
    const directory = createTestDirectory();
    const databasePath = path.join(directory, 'graph.sqlite');
    const tempDatabasePath = path.join(directory, 'graph.sqlite.123.tmp');
    writeFile(databasePath, 'old database');
    writeFile(tempDatabasePath, 'new database');
    let existingDatabaseMoved = false;
    const windowsFileSystem = {
      existsSync: fs.existsSync,
      renameSync(sourcePath: fs.PathLike, targetPath: fs.PathLike) {
        if (sourcePath === databasePath) {
          existingDatabaseMoved = true;
        }
        if (existingDatabaseMoved && sourcePath === tempDatabasePath && targetPath === databasePath) {
          const error = new Error('replacement failed') as NodeJS.ErrnoException;
          error.code = 'EPERM';
          throw error;
        }
        fs.renameSync(sourcePath, targetPath);
      },
      rmSync: fs.rmSync,
    };

    expect(() => replaceDatabaseCache(tempDatabasePath, databasePath, windowsFileSystem))
      .toThrow('replacement failed');

    expect(fs.readFileSync(databasePath, 'utf8')).toBe('old database');
    expect(fs.readFileSync(tempDatabasePath, 'utf8')).toBe('new database');
  });

  it('restores files already moved when backing up an old sidecar fails', () => {
    const directory = createTestDirectory();
    const databasePath = path.join(directory, 'graph.sqlite');
    const tempDatabasePath = path.join(directory, 'graph.sqlite.123.tmp');
    writeFile(databasePath, 'old database');
    writeFile(`${databasePath}-wal`, 'old wal');
    writeFile(tempDatabasePath, 'new database');
    const windowsFileSystem = {
      existsSync: fs.existsSync,
      renameSync(sourcePath: fs.PathLike, targetPath: fs.PathLike) {
        if (sourcePath === `${databasePath}-wal`) {
          const error = new Error('sidecar backup failed') as NodeJS.ErrnoException;
          error.code = 'EPERM';
          throw error;
        }
        fs.renameSync(sourcePath, targetPath);
      },
      rmSync: fs.rmSync,
    };

    expect(() => replaceDatabaseCache(tempDatabasePath, databasePath, windowsFileSystem))
      .toThrow('sidecar backup failed');

    expect(fs.readFileSync(databasePath, 'utf8')).toBe('old database');
    expect(fs.readFileSync(`${databasePath}-wal`, 'utf8')).toBe('old wal');
    expect(fs.readFileSync(tempDatabasePath, 'utf8')).toBe('new database');
  });
});
