import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createEmptyWorkspaceAnalysisCache } from '../../../../src/analysis/cache';
import {
  getWorkspaceAnalysisDatabasePath,
  loadWorkspaceAnalysisDatabaseCache,
  readWorkspaceAnalysisDatabaseSnapshot,
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
  NODE_VIEW_COLUMNS,
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
      nodeView: readRowsSync(connection, 'PRAGMA table_info(NodeView)').map(row => row.name),
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
      strictTables: readRowsSync(
        connection,
        "SELECT name FROM pragma_table_list WHERE name IN ('File', 'Node', 'NodeView', 'Symbol', 'Edge') AND strict = 1 ORDER BY name",
      ).map(row => row.name),
      nodeViewDefaults: readRowsSync(connection, 'PRAGMA table_info(NodeView)')
        .filter(row => row.name === 'favorite' || row.name === 'isCollapsed')
        .map(row => ({ name: row.name, notnull: row.notnull, defaultValue: row.dflt_value })),
    }));
    expect(columns).toEqual({
      tables: ['Edge', 'File', 'Node', 'NodeView', 'Symbol'],
      file: ['id', ...FILE_COLUMNS],
      node: ['id', ...NODE_COLUMNS],
      nodeView: [...NODE_VIEW_COLUMNS],
      symbol: [...SYMBOL_COLUMNS],
      edge: ['id', ...EDGE_COLUMNS],
      userVersion: 9,
      nodeForeignKeys: [
        { from: 'parentId', table: 'Node', to: 'id' },
        { from: 'fileId', table: 'File', to: 'id' },
      ],
      symbolForeignKeys: [{ from: 'nodeId', table: 'Node', to: 'id' }],
      edgeForeignKeys: [
        { from: 'targetNodeId', table: 'Node', to: 'id' },
        { from: 'sourceNodeId', table: 'Node', to: 'id' },
      ],
      strictTables: ['Edge', 'File', 'Node', 'NodeView', 'Symbol'],
      nodeViewDefaults: [
        { name: 'favorite', notnull: 1, defaultValue: '0' },
        { name: 'isCollapsed', notnull: 1, defaultValue: '0' },
      ],
    });
  });

  it('preserves view state by stable node key when the fact schema rebuilds', () => {
    const workspaceRoot = createWorkspaceRoot();
    const cache = createEmptyWorkspaceAnalysisCache();
    const graph = {
      nodes: [{
        id: 'src/app.ts',
        label: 'app.ts',
        color: '#123456',
        nodeType: 'file' as const,
        x: 12,
        y: 34,
        favorite: true,
        isCollapsed: true,
      }],
      edges: [],
    };
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, graph);
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);

    withConnection(databasePath, connection => {
      runStatementSync(connection, 'ALTER TABLE Node ADD COLUMN obsolete TEXT');
    });

    expect(loadWorkspaceAnalysisDatabaseCache(workspaceRoot)).toEqual(cache);
    saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, {
      nodes: [{
        id: 'src/app.ts',
        label: 'app.ts',
        color: '#abcdef',
        nodeType: 'file',
      }],
      edges: [],
    });

    expect(withConnection(databasePath, connection => (
      readRowsSync(connection, 'SELECT * FROM NodeView WHERE nodeKey = \'src/app.ts\'')[0]
    ))).toEqual({
      nodeKey: 'src/app.ts',
      color: '#abcdef',
      x: 12,
      y: 34,
      favorite: 1,
      shape: null,
      imageUrl: null,
      isCollapsed: 1,
    });
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).graph.nodes[0])
      .toMatchObject({ id: 'src/app.ts', x: 12, y: 34, favorite: true, isCollapsed: true });
  });
});
