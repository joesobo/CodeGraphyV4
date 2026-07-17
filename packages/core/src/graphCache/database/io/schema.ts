import type { SQLiteConnection } from './connection';

export const GRAPH_CACHE_SCHEMA_VERSION = 4;

function hasLegacySchema(connection: SQLiteConnection): boolean {
  const tables = connection.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  ).all() as Array<{ name?: string }>;
  const tableNames = new Set(tables.map(table => table.name));
  if (tableNames.has('File') || tableNames.has('Symbol') || tableNames.has('Relation')) {
    return true;
  }

  if (tableNames.has('IndexedFile')) {
    const indexedFileColumns = connection.pragma('table_info(IndexedFile)') as Array<{ name?: string }>;
    if (!indexedFileColumns.some(column => column.name === 'factsJson')) return true;
  }
  if (tableNames.has('Node')) {
    const nodeColumns = connection.pragma('table_info(Node)') as Array<{ name?: string }>;
    if (!nodeColumns.some(column => column.name === 'id')) return true;
  }
  if (tableNames.has('Edge')) {
    const edgeColumns = connection.pragma('table_info(Edge)') as Array<{ name?: string }>;
    if (!edgeColumns.some(column => column.name === 'sourcesJson')) return true;
  }
  return false;
}

function dropLegacySchema(connection: SQLiteConnection): void {
  connection.exec(`
    DROP TABLE IF EXISTS Edge;
    DROP TABLE IF EXISTS Node;
    DROP TABLE IF EXISTS IndexedFile;
    DROP TABLE IF EXISTS FileAnalysis;
    DROP TABLE IF EXISTS File;
    DROP TABLE IF EXISTS Symbol;
    DROP TABLE IF EXISTS Relation;
    DROP TABLE IF EXISTS NodeType;
    DROP TABLE IF EXISTS EdgeType;
  `);
}

export function ensureSchema(connection: SQLiteConnection): void {
  if (hasLegacySchema(connection)) {
    dropLegacySchema(connection);
  }

  connection.exec(`
    CREATE TABLE IF NOT EXISTS IndexedFile (
      path TEXT PRIMARY KEY,
      mtime INTEGER NOT NULL,
      size INTEGER NOT NULL,
      contentHash TEXT,
      factsJson TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Node (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      filePath TEXT,
      parentId TEXT,
      propertiesJson TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS Node_type_idx ON Node(type);
    CREATE INDEX IF NOT EXISTS Node_filePath_idx ON Node(filePath);
    CREATE INDEX IF NOT EXISTS Node_parentId_idx ON Node(parentId);
    CREATE TABLE IF NOT EXISTS Edge (
      id TEXT PRIMARY KEY,
      sourceId TEXT NOT NULL REFERENCES Node(id) ON DELETE CASCADE,
      targetId TEXT NOT NULL REFERENCES Node(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      propertiesJson TEXT NOT NULL,
      sourcesJson TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS Edge_source_type_idx ON Edge(sourceId, type);
    CREATE INDEX IF NOT EXISTS Edge_target_type_idx ON Edge(targetId, type);
    PRAGMA user_version = ${GRAPH_CACHE_SCHEMA_VERSION};
  `);
}

export async function ensureSchemaAsync(connection: SQLiteConnection): Promise<void> {
  ensureSchema(connection);
}
