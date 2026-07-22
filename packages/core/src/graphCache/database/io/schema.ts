import type { SQLiteConnection } from './connection';
import {
  EDGE_COLUMNS,
  FILE_COLUMNS,
  NODE_COLUMNS,
  SYMBOL_COLUMNS,
} from '../records/types';

export const GRAPH_CACHE_SCHEMA_VERSION = 10;

function tableColumns(connection: SQLiteConnection, table: string): string[] {
  const rows = connection.pragma(`table_info(${table})`) as Array<{ name?: string }>;
  return rows.flatMap(row => row.name === undefined ? [] : [row.name]);
}

function hasExpectedColumns(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((column, index) => column === expected[index]);
}

function cacheTableNames(connection: SQLiteConnection): Set<string> {
  const tables = connection.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  ).all() as Array<{ name?: string }>;
  return new Set(tables.flatMap(table => table.name === undefined ? [] : [table.name]));
}

function isStrictTable(connection: SQLiteConnection, table: string): boolean {
  const rows = connection.prepare(
    'SELECT strict FROM pragma_table_list WHERE name = @table',
  ).all({ table }) as Array<{ strict?: number | bigint }>;
  return Number(rows[0]?.strict) === 1;
}

export function hasCurrentGraphCacheSchema(connection: SQLiteConnection): boolean {
  const tableNames = cacheTableNames(connection);
  const cacheTables = [...tableNames].filter(name => name !== 'sqlite_sequence');

  if (cacheTables.length !== 4) return false;
  if (!tableNames.has('File') || !tableNames.has('Node')
    || !tableNames.has('Symbol') || !tableNames.has('Edge')) return false;

  return ['File', 'Node', 'Symbol', 'Edge']
    .every(table => isStrictTable(connection, table))
    && hasExpectedColumns(tableColumns(connection, 'File'), ['id', ...FILE_COLUMNS])
    && hasExpectedColumns(tableColumns(connection, 'Node'), ['id', ...NODE_COLUMNS])
    && hasExpectedColumns(tableColumns(connection, 'Symbol'), [...SYMBOL_COLUMNS])
    && hasExpectedColumns(tableColumns(connection, 'Edge'), ['id', ...EDGE_COLUMNS]);
}

function hasLegacySchema(connection: SQLiteConnection): boolean {
  const tableNames = cacheTableNames(connection);
  const cacheTables = [...tableNames].filter(name => name !== 'sqlite_sequence');
  return cacheTables.length > 0 && !hasCurrentGraphCacheSchema(connection);
}

function dropLegacySchema(connection: SQLiteConnection): void {
  connection.exec(`
    DROP TABLE IF EXISTS Edge;
    DROP TABLE IF EXISTS Symbol;
    DROP TABLE IF EXISTS Node;
    DROP TABLE IF EXISTS IndexedFile;
    DROP TABLE IF EXISTS FileAnalysis;
    DROP TABLE IF EXISTS Relation;
    DROP TABLE IF EXISTS NodeType;
    DROP TABLE IF EXISTS EdgeType;
    DROP TABLE IF EXISTS File;
    DROP TABLE IF EXISTS NodeView;
  `);
}

export function ensureSchema(connection: SQLiteConnection): void {
  if (hasLegacySchema(connection)) {
    dropLegacySchema(connection);
  }

  connection.exec(`
    CREATE TABLE IF NOT EXISTS File (
      id INTEGER PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      mtime REAL NOT NULL,
      size INTEGER NOT NULL CHECK (size >= -1),
      contentHash TEXT
    ) STRICT;
    CREATE TABLE IF NOT EXISTS Node (
      id INTEGER PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      fileId INTEGER REFERENCES File(id) ON DELETE SET NULL,
      parentId INTEGER REFERENCES Node(id) ON DELETE SET NULL,
      pluginId TEXT,
      language TEXT
    ) STRICT;
    CREATE INDEX IF NOT EXISTS Node_type_idx ON Node(type);
    CREATE INDEX IF NOT EXISTS Node_fileId_idx ON Node(fileId);
    CREATE INDEX IF NOT EXISTS Node_parentId_idx ON Node(parentId);
    CREATE TABLE IF NOT EXISTS Symbol (
      nodeId INTEGER PRIMARY KEY REFERENCES Node(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      pluginId TEXT,
      language TEXT
    ) STRICT;
    CREATE TABLE IF NOT EXISTS Edge (
      id INTEGER PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      sourceNodeId INTEGER NOT NULL REFERENCES Node(id) ON DELETE CASCADE,
      targetNodeId INTEGER NOT NULL REFERENCES Node(id) ON DELETE CASCADE,
      type TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS Edge_source_type_idx ON Edge(sourceNodeId, type);
    CREATE INDEX IF NOT EXISTS Edge_target_type_idx ON Edge(targetNodeId, type);
    PRAGMA user_version = ${GRAPH_CACHE_SCHEMA_VERSION};
  `);
}
