import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  readRowsSync,
  runStatementSync,
  withConnection,
  withRecreatedConnection,
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

  it('waits briefly for another Graph Cache writer', () => {
    const busyTimeout = withConnection(createDatabasePath(), connection => (
      connection.pragma('busy_timeout', { simple: true })
    ));

    expect(busyTimeout).toMatchObject({ timeout: 5_000 });
  });

  it('closes the database when the callback throws', () => {
    const databasePath = createDatabasePath();

    expect(() => withConnection(databasePath, () => {
      throw new Error('boom');
    })).toThrow('boom');

    expect(() => fs.rmSync(databasePath, { force: true })).not.toThrow();
  });

  it('repairs and retries an invalid database while retaining writer ownership', () => {
    const databasePath = createDatabasePath();
    fs.writeFileSync(databasePath, 'not a database');

    withRecreatedConnection(databasePath, (connection) => {
      expect(fs.existsSync(`${databasePath}.write-lock.sqlite`)).toBe(true);
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

    expect(() => withRecreatedConnection(
      databasePath,
      () => undefined,
      () => {
        throw new Error('reset failed');
      },
    )).toThrow('file is not a database');
  });
});
