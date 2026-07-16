import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  readRowsSync,
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
        "INSERT INTO FileAnalysis(filePath, mtime, size, analysis) VALUES ('src/app.ts', 1, 2, '{}')",
      );
      return readRowsSync(
        connection,
        'SELECT filePath, mtime, size, analysis FROM FileAnalysis ORDER BY filePath',
      );
    });

    expect(rows).toEqual([{
      filePath: 'src/app.ts',
      mtime: 1,
      size: 2,
      analysis: '{}',
    }]);
  });

  it('closes the database when the callback throws', () => {
    const databasePath = createDatabasePath();

    expect(() => withConnection(databasePath, () => {
      throw new Error('boom');
    })).toThrow('boom');

    expect(() => fs.rmSync(databasePath, { force: true })).not.toThrow();
  });
});
