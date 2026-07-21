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
import {
  EDGE_COLUMNS,
  FILE_COLUMNS,
  NODE_COLUMNS,
  SYMBOL_COLUMNS,
} from '../../../../src/graphCache/database/records/types';

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
  it('rebuilds the cache into normalized relational tables with generated identities', () => {
    const workspaceRoot = createWorkspaceRoot();
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, createEmptyWorkspaceAnalysisCache());
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);

    withConnection(databasePath, (connection) => {
      runStatementSync(connection, 'DROP TABLE Edge');
      runStatementSync(connection, 'DROP TABLE Symbol');
      runStatementSync(connection, 'DROP TABLE Node');
      runStatementSync(connection, 'DROP TABLE File');
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
      file: readRowsSync(connection, 'PRAGMA table_info(File)').map(row => row.name),
      node: readRowsSync(connection, 'PRAGMA table_info(Node)').map(row => row.name),
      symbol: readRowsSync(connection, 'PRAGMA table_info(Symbol)').map(row => row.name),
      tables: readRowsSync(
        connection,
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      ).map(row => row.name),
      userVersion: readRowsSync(connection, 'PRAGMA user_version')[0]?.user_version,
      nodeForeignKeys: readRowsSync(connection, 'PRAGMA foreign_key_list(Node)')
        .map(row => ({ from: row.from, table: row.table, to: row.to })),
      symbolForeignKeys: readRowsSync(connection, 'PRAGMA foreign_key_list(Symbol)')
        .map(row => ({ from: row.from, table: row.table, to: row.to })),
      edgeForeignKeys: readRowsSync(connection, 'PRAGMA foreign_key_list(Edge)')
        .map(row => ({ from: row.from, table: row.table, to: row.to })),
    }));
    expect(columns).toEqual({
      tables: ['Edge', 'File', 'Node', 'Symbol'],
      file: ['id', ...FILE_COLUMNS],
      node: ['id', ...NODE_COLUMNS],
      symbol: [...SYMBOL_COLUMNS],
      edge: ['id', ...EDGE_COLUMNS],
      userVersion: 7,
      nodeForeignKeys: [
        { from: 'parentId', table: 'Node', to: 'id' },
        { from: 'fileId', table: 'File', to: 'id' },
      ],
      symbolForeignKeys: [{ from: 'nodeId', table: 'Node', to: 'id' }],
      edgeForeignKeys: [
        { from: 'targetNodeId', table: 'Node', to: 'id' },
        { from: 'sourceNodeId', table: 'Node', to: 'id' },
      ],
    });
  });
});
