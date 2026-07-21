import type { SQLiteConnection } from './connection';
import { EDGE_COLUMNS, FILE_COLUMNS, NODE_COLUMNS } from '../records/types';

export const GRAPH_CACHE_SCHEMA_VERSION = 5;

function tableColumns(connection: SQLiteConnection, table: string): string[] {
  const rows = connection.pragma(`table_info(${table})`) as Array<{ name?: string }>;
  return rows.flatMap(row => row.name === undefined ? [] : [row.name]);
}

function hasExpectedColumns(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((column, index) => column === expected[index]);
}

function hasLegacySchema(connection: SQLiteConnection): boolean {
  const tables = connection.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  ).all() as Array<{ name?: string }>;
  const tableNames = new Set(tables.flatMap(table => table.name === undefined ? [] : [table.name]));
  const cacheTables = [...tableNames].filter(name => name !== 'sqlite_sequence');

  if (cacheTables.length === 0) return false;
  if (cacheTables.length !== 3) return true;
  if (!tableNames.has('File') || !tableNames.has('Node') || !tableNames.has('Edge')) return true;

  return !hasExpectedColumns(tableColumns(connection, 'File'), [...FILE_COLUMNS])
    || !hasExpectedColumns(tableColumns(connection, 'Node'), [...NODE_COLUMNS])
    || !hasExpectedColumns(tableColumns(connection, 'Edge'), [...EDGE_COLUMNS]);
}

function dropLegacySchema(connection: SQLiteConnection): void {
  connection.exec(`
    DROP TABLE IF EXISTS Edge;
    DROP TABLE IF EXISTS Node;
    DROP TABLE IF EXISTS IndexedFile;
    DROP TABLE IF EXISTS FileAnalysis;
    DROP TABLE IF EXISTS Symbol;
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
      path TEXT PRIMARY KEY,
      analysisPath TEXT NOT NULL,
      mtime INTEGER NOT NULL,
      size INTEGER NOT NULL,
      contentHash TEXT,
      baselineIndexed INTEGER NOT NULL CHECK (baselineIndexed IN (0, 1)),
      nodesIndexed INTEGER NOT NULL CHECK (nodesIndexed IN (0, 1)),
      symbolsIndexed INTEGER NOT NULL CHECK (symbolsIndexed IN (0, 1)),
      relationsIndexed INTEGER NOT NULL CHECK (relationsIndexed IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS Node (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      filePath TEXT REFERENCES File(path) ON DELETE SET NULL,
      parentId TEXT REFERENCES Node(id) ON DELETE SET NULL,
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
      analysisSymbolId TEXT,
      analysisSymbolFilePath TEXT,
      analysisSymbolOrder INTEGER,
      pluginId TEXT,
      language TEXT,
      analysisSource TEXT,
      pluginKind TEXT,
      symbolName TEXT,
      symbolKind TEXT,
      symbolSignature TEXT,
      startLine INTEGER,
      startColumn INTEGER,
      endLine INTEGER,
      endColumn INTEGER,
      gitIgnored INTEGER CHECK (gitIgnored IN (0, 1)),
      gitIgnoredReason TEXT,
      unityClass TEXT,
      unityFileId TEXT,
      unityGameObjectFileId TEXT,
      unityScriptGuid TEXT,
      unityScriptPath TEXT
    );
    CREATE INDEX IF NOT EXISTS Node_type_idx ON Node(type);
    CREATE INDEX IF NOT EXISTS Node_filePath_idx ON Node(filePath);
    CREATE INDEX IF NOT EXISTS Node_parentId_idx ON Node(parentId);
    CREATE TABLE IF NOT EXISTS Edge (
      id TEXT PRIMARY KEY,
      graphId TEXT NOT NULL,
      sourceNodeId TEXT NOT NULL REFERENCES Node(id) ON DELETE CASCADE,
      targetNodeId TEXT NOT NULL REFERENCES Node(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      ownerFilePath TEXT REFERENCES File(path) ON DELETE CASCADE,
      color TEXT,
      sourcePluginId TEXT,
      relationPluginId TEXT,
      sourceKey TEXT,
      pluginSourceId TEXT,
      analysisSourceId TEXT,
      sourceLabel TEXT,
      variant TEXT,
      specifier TEXT,
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
    CREATE INDEX IF NOT EXISTS Edge_graphId_idx ON Edge(graphId);
    CREATE INDEX IF NOT EXISTS Edge_source_type_idx ON Edge(sourceNodeId, type);
    CREATE INDEX IF NOT EXISTS Edge_target_type_idx ON Edge(targetNodeId, type);
    CREATE INDEX IF NOT EXISTS Edge_ownerFilePath_idx ON Edge(ownerFilePath);
    PRAGMA user_version = ${GRAPH_CACHE_SCHEMA_VERSION};
  `);
}

export async function ensureSchemaAsync(connection: SQLiteConnection): Promise<void> {
  ensureSchema(connection);
}
