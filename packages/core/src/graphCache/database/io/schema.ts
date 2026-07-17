import type { SQLiteConnection } from './connection';

export function ensureSchema(connection: SQLiteConnection): void {
  connection.exec(`
    DROP TABLE IF EXISTS FileAnalysis;
    CREATE TABLE IF NOT EXISTS File (
      filePath TEXT PRIMARY KEY,
      mtime INTEGER NOT NULL,
      size INTEGER NOT NULL,
      contentHash TEXT,
      factsJson TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS Symbol (
      symbolId TEXT PRIMARY KEY,
      filePath TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      signature TEXT,
      rangeJson TEXT,
      metadataJson TEXT
    );
    CREATE INDEX IF NOT EXISTS Symbol_filePath_idx ON Symbol(filePath);
    CREATE TABLE IF NOT EXISTS Relation (
      relationId TEXT PRIMARY KEY,
      filePath TEXT NOT NULL,
      kind TEXT NOT NULL,
      pluginId TEXT,
      sourceId TEXT NOT NULL,
      fromFilePath TEXT,
      toFilePath TEXT,
      fromNodeId TEXT,
      toNodeId TEXT,
      fromSymbolId TEXT,
      toSymbolId TEXT,
      specifier TEXT,
      relationType TEXT,
      variant TEXT,
      resolvedPath TEXT,
      metadataJson TEXT
    );
    CREATE INDEX IF NOT EXISTS Relation_filePath_idx ON Relation(filePath);
  `);

  const fileColumns = connection.pragma('table_info(File)') as Array<{ name?: string }>;
  if (!fileColumns.some(column => column.name === 'contentHash')) {
    connection.exec('ALTER TABLE File ADD COLUMN contentHash TEXT');
  }
}

export async function ensureSchemaAsync(connection: SQLiteConnection): Promise<void> {
  ensureSchema(connection);
}
