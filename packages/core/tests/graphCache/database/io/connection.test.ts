import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  readRowsSync,
  recreateInvalidDatabase,
  runStatementSync,
  withConnection,
} from '../../../../src/graphCache/database/io/connection';

const temporaryDirectories = new Set<string>();

function createDatabasePath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-sqlite-'));
  temporaryDirectories.add(directory);
  return path.join(directory, 'graph.sqlite');
}

afterEach(() => {
  for (const directory of temporaryDirectories) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  temporaryDirectories.clear();
});

describe('graphCache/database/io/connection', () => {
  it('executes statements and reads deterministic rows', () => {
    const rows = withConnection(createDatabasePath(), (connection) => {
      runStatementSync(
        connection,
        "INSERT INTO File(path, mtime, size, contentHash) VALUES ('src/app.ts', 123.5, 2, 'sha256:app')",
      );
      return readRowsSync(
        connection,
        'SELECT path, mtime, size, contentHash FROM File ORDER BY path',
      );
    });

    expect(rows).toEqual([{
      path: 'src/app.ts',
      mtime: 123.5,
      size: 2,
      contentHash: 'sha256:app',
    }]);
  });

  it('closes the database when the callback throws', () => {
    const databasePath = createDatabasePath();

    expect(() => withConnection(databasePath, () => {
      throw new Error('boom');
    })).toThrow('boom');

    expect(() => fs.rmSync(databasePath, { force: true })).not.toThrow();
  });

  it('recreates an invalid database before opening it for a full save', () => {
    const databasePath = createDatabasePath();
    fs.writeFileSync(databasePath, 'not a database');
    let invalidDatabaseError: unknown;
    try {
      withConnection(databasePath, () => undefined);
    } catch (error) {
      invalidDatabaseError = error;
    }

    expect(recreateInvalidDatabase(databasePath, invalidDatabaseError)).toBe(true);

    withConnection(databasePath, (connection) => {
      runStatementSync(
        connection,
        "INSERT INTO File(path, mtime, size, contentHash) VALUES ('src/app.ts', 123.5, 2, 'sha256:app')",
      );
    });

    const rows = withConnection(databasePath, connection => readRowsSync(
      connection,
      'SELECT path, mtime, size, contentHash FROM File ORDER BY path',
    ));
    expect(rows).toEqual([{
      path: 'src/app.ts',
      mtime: 123.5,
      size: 2,
      contentHash: 'sha256:app',
    }]);
  });

  it('preserves the invalid database error when recreation reset fails', () => {
    const databasePath = createDatabasePath();
    fs.writeFileSync(databasePath, 'not a database');
    let invalidDatabaseError: unknown;
    try {
      withConnection(databasePath, () => undefined);
    } catch (error) {
      invalidDatabaseError = error;
    }

    expect(() => recreateInvalidDatabase(
      databasePath,
      invalidDatabaseError,
      () => {
        throw new Error('reset failed');
      },
    )).toThrow('file is not a database');
  });
});
