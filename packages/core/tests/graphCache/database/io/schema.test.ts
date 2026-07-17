import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createEmptyWorkspaceAnalysisCache } from '../../../../src/analysis/cache';
import {
  getWorkspaceAnalysisDatabasePath,
  loadWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCache,
} from '../../../../src/graphCache/database/storage';
import {
  readRowsSync,
  runStatementSync,
  withConnection,
} from '../../../../src/graphCache/database/io/connection';

const tempRoots = new Set<string>();

function createWorkspaceRoot(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-schema-'));
  tempRoots.add(workspaceRoot);
  return workspaceRoot;
}

afterEach(() => {
  for (const workspaceRoot of tempRoots) {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
  tempRoots.clear();
});

describe('workspace analysis database schema', () => {
  it('rebuilds the pre-release property graph schema with specific JSON column names', () => {
    const workspaceRoot = createWorkspaceRoot();
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, createEmptyWorkspaceAnalysisCache());
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);

    withConnection(databasePath, (connection) => {
      runStatementSync(connection, 'DROP TABLE Edge');
      runStatementSync(connection, 'DROP TABLE Node');
      runStatementSync(connection, 'DROP TABLE IndexedFile');
      runStatementSync(connection, 'CREATE TABLE IndexedFile(path TEXT PRIMARY KEY, mtime INTEGER NOT NULL, size INTEGER NOT NULL, contentHash TEXT, analyzerStateJson TEXT NOT NULL)');
      runStatementSync(connection, 'CREATE TABLE Node(id TEXT PRIMARY KEY, type TEXT NOT NULL, label TEXT NOT NULL, filePath TEXT, parentId TEXT, propertiesJson TEXT NOT NULL)');
      runStatementSync(connection, 'CREATE TABLE Edge(id TEXT PRIMARY KEY, sourceId TEXT NOT NULL, targetId TEXT NOT NULL, type TEXT NOT NULL, propertiesJson TEXT NOT NULL, provenanceJson TEXT NOT NULL)');
      runStatementSync(connection, "INSERT INTO IndexedFile VALUES ('src/old.ts', 1, 2, NULL, '{}')");
    });

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(
      createEmptyWorkspaceAnalysisCache(),
    );

    const columns = withConnection(databasePath, connection => ({
      edge: readRowsSync(connection, 'PRAGMA table_info(Edge)').map(row => row.name),
      indexedFile: readRowsSync(connection, 'PRAGMA table_info(IndexedFile)').map(row => row.name),
      userVersion: readRowsSync(connection, 'PRAGMA user_version')[0]?.user_version,
    }));
    expect(columns).toEqual({
      edge: ['id', 'sourceId', 'targetId', 'type', 'propertiesJson', 'sourcesJson'],
      indexedFile: ['path', 'mtime', 'size', 'contentHash', 'factsJson'],
      userVersion: 4,
    });
  });
});
