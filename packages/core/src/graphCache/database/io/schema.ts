import type { SQLiteConnection } from './connection';

function hasLegacySchema(connection: SQLiteConnection): boolean {
  const tables = connection.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  ).all() as Array<{ name?: string }>;
  const tableNames = new Set(tables.map(table => table.name));
  if (tableNames.has('File') || tableNames.has('Symbol') || tableNames.has('Relation')) {
    return true;
  }

  if (!tableNames.has('Node')) return false;
  const nodeColumns = connection.pragma('table_info(Node)') as Array<{ name?: string }>;
  return !nodeColumns.some(column => column.name === 'id');
}

function dropLegacySchema(connection: SQLiteConnection): void {
  connection.exec(`
    DROP TABLE IF EXISTS FileAnalysis;
    DROP TABLE IF EXISTS File;
    DROP TABLE IF EXISTS Symbol;
    DROP TABLE IF EXISTS Relation;
    DROP TABLE IF EXISTS NodeType;
    DROP TABLE IF EXISTS EdgeType;
    DROP TABLE IF EXISTS Node;
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
      analyzerStateJson TEXT NOT NULL
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
      provenanceJson TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS Edge_source_type_idx ON Edge(sourceId, type);
    CREATE INDEX IF NOT EXISTS Edge_target_type_idx ON Edge(targetId, type);
    PRAGMA user_version = 3;
  `);
}

export async function ensureSchemaAsync(connection: SQLiteConnection): Promise<void> {
  ensureSchema(connection);
}
