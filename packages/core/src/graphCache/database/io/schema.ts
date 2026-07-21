import type { SQLiteConnection } from './connection';
import { EDGE_COLUMNS, FILE_COLUMNS, NODE_COLUMNS, SYMBOL_COLUMNS } from '../records/types';

export const GRAPH_CACHE_SCHEMA_VERSION = 6;

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

export function hasCurrentGraphCacheSchema(connection: SQLiteConnection): boolean {
  const tableNames = cacheTableNames(connection);
  const cacheTables = [...tableNames].filter(name => name !== 'sqlite_sequence');

  if (cacheTables.length !== 4) return false;
  if (!tableNames.has('File') || !tableNames.has('Node')
    || !tableNames.has('Symbol') || !tableNames.has('Edge')) return false;

  return hasExpectedColumns(tableColumns(connection, 'File'), ['id', ...FILE_COLUMNS])
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
      analysisPath TEXT NOT NULL,
      mtime INTEGER NOT NULL,
      size INTEGER NOT NULL,
      contentHash TEXT
    );
    CREATE TABLE IF NOT EXISTS Node (
      id INTEGER PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      fileId INTEGER REFERENCES File(id) ON DELETE SET NULL,
      parentId INTEGER REFERENCES Node(id) ON DELETE SET NULL,
      color TEXT,
      x REAL,
      y REAL,
      favorite INTEGER CHECK (favorite IN (0, 1)),
      fileSize INTEGER,
      depthLevel INTEGER,
      shape TEXT,
      shapeWidth REAL,
      shapeHeight REAL,
      cornerRadius REAL,
      collisionRadius REAL,
      chargeStrengthMultiplier REAL,
      fillOpacity REAL,
      pointerWidth REAL,
      pointerHeight REAL,
      imageUrl TEXT,
      isCollapsible INTEGER CHECK (isCollapsible IN (0, 1)),
      isCollapsed INTEGER CHECK (isCollapsed IN (0, 1)),
      collapsedDescendantCount INTEGER,
      analysisNodeId TEXT,
      analysisNodeFilePath TEXT,
      analysisParentId TEXT,
      analysisNodeOrder INTEGER,
      pluginId TEXT,
      language TEXT,
      analysisSource TEXT,
      pluginKind TEXT,
      gitIgnored INTEGER CHECK (gitIgnored IN (0, 1)),
      gitIgnoredReason TEXT,
      unityClass TEXT,
      unityFileId TEXT,
      unityGameObjectFileId TEXT,
      unityScriptGuid TEXT,
      unityScriptPath TEXT
    );
    CREATE INDEX IF NOT EXISTS Node_type_idx ON Node(type);
    CREATE INDEX IF NOT EXISTS Node_fileId_idx ON Node(fileId);
    CREATE INDEX IF NOT EXISTS Node_parentId_idx ON Node(parentId);
    CREATE TABLE IF NOT EXISTS Symbol (
      nodeId INTEGER PRIMARY KEY REFERENCES Node(id) ON DELETE CASCADE,
      filePath TEXT NOT NULL,
      analysisId TEXT,
      analysisPath TEXT,
      analysisOrder INTEGER,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      signature TEXT,
      startLine INTEGER,
      startColumn INTEGER,
      endLine INTEGER,
      endColumn INTEGER,
      pluginId TEXT,
      language TEXT,
      analysisSource TEXT,
      pluginKind TEXT
    );
    CREATE TABLE IF NOT EXISTS Edge (
      id INTEGER PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      graphKey TEXT NOT NULL,
      sourceNodeId INTEGER NOT NULL REFERENCES Node(id) ON DELETE CASCADE,
      targetNodeId INTEGER NOT NULL REFERENCES Node(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      ownerFileId INTEGER REFERENCES File(id) ON DELETE CASCADE,
      color TEXT,
      sourcePluginId TEXT,
      relationPluginId TEXT,
      sourceKey TEXT,
      pluginSourceId TEXT,
      analysisSourceId TEXT,
      sourceLabel TEXT,
      variant TEXT,
      relationSpecifier TEXT,
      resolvedPath TEXT,
      relationType TEXT,
      fromFilePath TEXT,
      toFilePath TEXT,
      fromAnalysisNodeId TEXT,
      toAnalysisNodeId TEXT,
      fromSymbolId TEXT,
      toSymbolId TEXT,
      edgeLanguage TEXT,
      edgeOrigin TEXT,
      edgeBindingKind TEXT,
      edgeImportedName TEXT,
      edgeLocalName TEXT,
      edgeMemberName TEXT,
      edgeSignalName TEXT,
      edgeEventMethodName TEXT,
      edgeTargetFileId TEXT,
      edgeTargetScriptPath TEXT,
      edgeTargetScriptGuid TEXT,
      edgeScriptGuid TEXT,
      edgePrefabGuid TEXT,
      edgeFieldName TEXT,
      edgeGuid TEXT,
      sourceLanguage TEXT,
      sourceOrigin TEXT,
      sourceBindingKind TEXT,
      sourceImportedName TEXT,
      sourceLocalName TEXT,
      sourceMemberName TEXT,
      sourceSignalName TEXT,
      sourceEventMethodName TEXT,
      sourceTargetFileId TEXT,
      sourceTargetScriptPath TEXT,
      sourceTargetScriptGuid TEXT,
      sourceScriptGuid TEXT,
      sourcePrefabGuid TEXT,
      sourceFieldName TEXT,
      sourceGuid TEXT,
      relationLanguage TEXT,
      relationOrigin TEXT,
      relationBindingKind TEXT,
      relationImportedName TEXT,
      relationLocalName TEXT,
      relationMemberName TEXT,
      relationSignalName TEXT,
      relationEventMethodName TEXT,
      relationTargetFileId TEXT,
      relationTargetScriptPath TEXT,
      relationTargetScriptGuid TEXT,
      relationScriptGuid TEXT,
      relationPrefabGuid TEXT,
      relationFieldName TEXT,
      relationGuid TEXT,
      analysisRelation INTEGER NOT NULL DEFAULT 0 CHECK (analysisRelation IN (0, 1)),
      analysisOrder INTEGER,
      canonicalGraphEdge INTEGER NOT NULL DEFAULT 0 CHECK (canonicalGraphEdge IN (0, 1))
    );
    CREATE INDEX IF NOT EXISTS Edge_graphKey_idx ON Edge(graphKey);
    CREATE INDEX IF NOT EXISTS Edge_source_type_idx ON Edge(sourceNodeId, type);
    CREATE INDEX IF NOT EXISTS Edge_target_type_idx ON Edge(targetNodeId, type);
    CREATE INDEX IF NOT EXISTS Edge_ownerFileId_idx ON Edge(ownerFileId);
    PRAGMA user_version = ${GRAPH_CACHE_SCHEMA_VERSION};
  `);
}

export async function ensureSchemaAsync(connection: SQLiteConnection): Promise<void> {
  ensureSchema(connection);
}
