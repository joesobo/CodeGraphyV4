import * as fs from 'node:fs';
import * as path from 'node:path';
import * as lb from '@ladybugdb/core';
import {
  createEmptyWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
  type IWorkspaceAnalysisCache,
} from '../cache';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '../../../core/plugins/types/contracts';

const DATABASE_DIRECTORY_NAME = '.codegraphy';
const DATABASE_FILE_NAME = 'graph.lbug';

interface FileAnalysisRow {
  filePath?: unknown;
  mtime?: unknown;
  size?: unknown;
  analysis?: unknown;
}

interface SymbolRow {
  symbolId?: unknown;
  filePath?: unknown;
  name?: unknown;
  kind?: unknown;
  signature?: unknown;
  rangeJson?: unknown;
  metadataJson?: unknown;
}

interface RelationRow {
  relationId?: unknown;
  filePath?: unknown;
  kind?: unknown;
  pluginId?: unknown;
  sourceId?: unknown;
  fromFilePath?: unknown;
  toFilePath?: unknown;
  fromNodeId?: unknown;
  toNodeId?: unknown;
  fromSymbolId?: unknown;
  toSymbolId?: unknown;
  specifier?: unknown;
  relationType?: unknown;
  variant?: unknown;
  resolvedPath?: unknown;
  metadataJson?: unknown;
}

export interface WorkspaceAnalysisDatabaseSnapshot {
  files: Array<{
    filePath: string;
    mtime: number;
    size?: number;
    analysis: IFileAnalysisResult;
  }>;
  symbols: IAnalysisSymbol[];
  relations: IAnalysisRelation[];
}

interface LadybugQueryResultLike {
  getAllSync?(): FileAnalysisRow[];
  close?(): void;
}

function ensureDatabaseDirectory(workspaceRoot: string): void {
  if (!fs.existsSync(workspaceRoot)) {
    return;
  }

  fs.mkdirSync(path.join(workspaceRoot, DATABASE_DIRECTORY_NAME), { recursive: true });
}

function escapeCypherString(value: string): string {
  return JSON.stringify(value);
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function parseOptionalJson<T>(value: unknown): T | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  const parsed = JSON.parse(value) as T | null;
  return parsed ?? undefined;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.length > 0 ? value : undefined;
}

function readRequiredString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' || typeof value === 'bigint'
    ? Number(value)
    : undefined;
}

function createSnapshotFileEntry(
  row: FileAnalysisRow,
):
  | {
      filePath: string;
      mtime: number;
      size?: number;
      analysis: IFileAnalysisResult;
    }
  | undefined {
  const filePath = readRequiredString(row.filePath);
  const analysisText = readRequiredString(row.analysis);

  if (!filePath || !analysisText) {
    return undefined;
  }

  return {
    filePath,
    mtime: Number(row.mtime ?? 0),
    size: readOptionalNumber(row.size),
    analysis: JSON.parse(analysisText) as IFileAnalysisResult,
  };
}

function createSnapshotSymbolEntry(row: SymbolRow): IAnalysisSymbol | undefined {
  const symbolId = readRequiredString(row.symbolId);
  const filePath = readRequiredString(row.filePath);
  const name = readRequiredString(row.name);
  const kind = readRequiredString(row.kind);

  if (!symbolId || !filePath || !name || !kind) {
    return undefined;
  }

  return {
    id: symbolId,
    filePath,
    name,
    kind,
    signature: readOptionalString(row.signature),
    range: parseOptionalJson(row.rangeJson),
    metadata: parseOptionalJson(row.metadataJson),
  };
}

function createSnapshotRelationEntry(row: RelationRow): IAnalysisRelation | undefined {
  const filePath = readRequiredString(row.filePath);
  const kind = readRequiredString(row.kind);
  const sourceId = readRequiredString(row.sourceId);
  const fromFilePath = readRequiredString(row.fromFilePath);

  if (!filePath || !kind || !sourceId || !fromFilePath) {
    return undefined;
  }

  return {
    kind: kind as IAnalysisRelation['kind'],
    pluginId: readOptionalString(row.pluginId),
    sourceId,
    fromFilePath,
    toFilePath: readOptionalString(row.toFilePath),
    fromNodeId: readOptionalString(row.fromNodeId),
    toNodeId: readOptionalString(row.toNodeId),
    fromSymbolId: readOptionalString(row.fromSymbolId),
    toSymbolId: readOptionalString(row.toSymbolId),
    specifier: readOptionalString(row.specifier),
    type: readOptionalString(row.relationType),
    variant: readOptionalString(row.variant),
    resolvedPath: readOptionalString(row.resolvedPath),
    metadata: parseOptionalJson(row.metadataJson),
  };
}

function createRelationRowId(
  filePath: string,
  relation: IAnalysisRelation,
  index: number,
): string {
  return [
    filePath,
    relation.kind,
    relation.sourceId,
    relation.fromFilePath,
    relation.toFilePath ?? '',
    relation.fromSymbolId ?? '',
    relation.toSymbolId ?? '',
    relation.specifier ?? '',
    relation.type ?? '',
    relation.variant ?? '',
    String(index),
  ].join('|');
}

function createFileAnalysisStatement(
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): string {
  return `CREATE (entry:FileAnalysis {filePath: ${escapeCypherString(filePath)}, mtime: ${entry.mtime}, size: ${entry.size ?? 0}, analysis: ${escapeCypherString(JSON.stringify(entry.analysis))}})`;
}

function createSymbolStatement(symbol: IAnalysisSymbol): string {
  return `CREATE (entry:Symbol {symbolId: ${escapeCypherString(symbol.id)}, filePath: ${escapeCypherString(symbol.filePath)}, name: ${escapeCypherString(symbol.name)}, kind: ${escapeCypherString(symbol.kind)}, signature: ${escapeCypherString(symbol.signature ?? '')}, rangeJson: ${escapeCypherString(serializeJson(symbol.range))}, metadataJson: ${escapeCypherString(serializeJson(symbol.metadata))}})`;
}

function createCypherStringProperty(key: string, value: string): string {
  return `${key}: ${escapeCypherString(value)}`;
}

function createRelationIdentityProperties(
  filePath: string,
  relation: IAnalysisRelation,
  relationIndex: number,
): string[] {
  return [
    createCypherStringProperty('relationId', createRelationRowId(filePath, relation, relationIndex)),
    createCypherStringProperty('filePath', filePath),
    createCypherStringProperty('kind', relation.kind),
    createCypherStringProperty('sourceId', relation.sourceId),
  ];
}

function createRelationEndpointProperties(relation: IAnalysisRelation): string[] {
  return [
    createCypherStringProperty('fromFilePath', relation.fromFilePath),
    createCypherStringProperty('toFilePath', relation.toFilePath ?? ''),
    createCypherStringProperty('fromNodeId', relation.fromNodeId ?? ''),
    createCypherStringProperty('toNodeId', relation.toNodeId ?? ''),
    createCypherStringProperty('fromSymbolId', relation.fromSymbolId ?? ''),
    createCypherStringProperty('toSymbolId', relation.toSymbolId ?? ''),
  ];
}

function createRelationDescriptorProperties(relation: IAnalysisRelation): string[] {
  return [
    createCypherStringProperty('pluginId', relation.pluginId ?? ''),
    createCypherStringProperty('specifier', relation.specifier ?? ''),
    createCypherStringProperty('relationType', relation.type ?? ''),
    createCypherStringProperty('variant', relation.variant ?? ''),
    createCypherStringProperty('resolvedPath', relation.resolvedPath ?? ''),
    createCypherStringProperty('metadataJson', serializeJson(relation.metadata)),
  ];
}

function createRelationStatementProperties(
  filePath: string,
  relation: IAnalysisRelation,
  relationIndex: number,
): string {
  return [
    ...createRelationIdentityProperties(filePath, relation, relationIndex),
    ...createRelationEndpointProperties(relation),
    ...createRelationDescriptorProperties(relation),
  ].join(', ');
}

function createRelationStatement(
  filePath: string,
  relation: IAnalysisRelation,
  relationIndex: number,
): string {
  return `CREATE (entry:Relation {${createRelationStatementProperties(filePath, relation, relationIndex)}})`;
}

function sortedCacheEntries(
  cache: IWorkspaceAnalysisCache,
): Array<[string, IWorkspaceAnalysisCache['files'][string]]> {
  return Object.entries(cache.files).sort(([left], [right]) => left.localeCompare(right));
}

function persistAnalysisEntry(
  connection: lb.Connection,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): void {
  runStatementSync(connection, createFileAnalysisStatement(filePath, entry));

  for (const symbol of entry.analysis.symbols ?? []) {
    runStatementSync(connection, createSymbolStatement(symbol));
  }

  for (const [relationIndex, relation] of (entry.analysis.relations ?? []).entries()) {
    runStatementSync(connection, createRelationStatement(filePath, relation, relationIndex));
  }
}

function clearDatabaseArtifacts(databasePath: string): void {
  for (const filePath of [databasePath, `${databasePath}.wal`]) {
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      // Best effort only.
    }
  }
}

function closeQueryResults(result: unknown): void {
  const queryResults = Array.isArray(result) ? result : [result];

  for (const queryResult of queryResults) {
    try {
      (queryResult as LadybugQueryResultLike | undefined)?.close?.();
    } catch {
      // Best effort only.
    }
  }
}

function runStatementSync(connection: lb.Connection, statement: string): void {
  const result = connection.querySync(statement);
  closeQueryResults(result);
}

function readRowsSync(connection: lb.Connection, statement: string): FileAnalysisRow[] {
  const result = connection.querySync(statement);

  try {
    const queryResult = Array.isArray(result) ? result[0] : result;
    return (queryResult as LadybugQueryResultLike | undefined)?.getAllSync?.() ?? [];
  } finally {
    closeQueryResults(result);
  }
}

function ensureSchema(connection: lb.Connection): void {
  runStatementSync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS FileAnalysis(filePath STRING PRIMARY KEY, mtime INT64, size INT64, analysis STRING)',
  );
  runStatementSync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS Symbol(symbolId STRING PRIMARY KEY, filePath STRING, name STRING, kind STRING, signature STRING, rangeJson STRING, metadataJson STRING)',
  );
  runStatementSync(
    connection,
    'CREATE NODE TABLE IF NOT EXISTS Relation(relationId STRING PRIMARY KEY, filePath STRING, kind STRING, pluginId STRING, sourceId STRING, fromFilePath STRING, toFilePath STRING, fromNodeId STRING, toNodeId STRING, fromSymbolId STRING, toSymbolId STRING, specifier STRING, relationType STRING, variant STRING, resolvedPath STRING, metadataJson STRING)',
  );
}

function withConnection<T>(
  databasePath: string,
  callback: (connection: lb.Connection) => T,
): T {
  const database = new lb.Database(databasePath);
  const connection = new lb.Connection(database);

  try {
    connection.initSync();
    ensureSchema(connection);
    return callback(connection);
  } finally {
    connection.closeSync();
    database.closeSync();
  }
}

export function getWorkspaceAnalysisDatabasePath(workspaceRoot: string): string {
  return path.join(workspaceRoot, DATABASE_DIRECTORY_NAME, DATABASE_FILE_NAME);
}

export function loadWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
): IWorkspaceAnalysisCache {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return createEmptyWorkspaceAnalysisCache();
  }

  try {
    return withConnection(databasePath, (connection) => {
      const rows = readRowsSync(
        connection,
        'MATCH (entry:FileAnalysis) RETURN entry.filePath AS filePath, entry.mtime AS mtime, entry.size AS size, entry.analysis AS analysis ORDER BY entry.filePath',
      );
      const cache = createEmptyWorkspaceAnalysisCache();

      for (const row of rows) {
        try {
          const entry = createSnapshotFileEntry(row);
          if (!entry) {
            continue;
          }

          cache.files[entry.filePath] = {
            mtime: entry.mtime,
            size: entry.size,
            analysis: entry.analysis,
          };
        } catch (error) {
          console.warn('[CodeGraphy] Skipping unreadable persisted analysis row.', error);
        }
      }

      cache.version = WORKSPACE_ANALYSIS_CACHE_VERSION;
      return cache;
    });
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read persisted analysis database. Rebuilding cache.', error);
    clearDatabaseArtifacts(databasePath);
    return createEmptyWorkspaceAnalysisCache();
  }
}

export function readWorkspaceAnalysisDatabaseSnapshot(
  workspaceRoot: string,
): WorkspaceAnalysisDatabaseSnapshot {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return { files: [], symbols: [], relations: [] };
  }

  try {
    return withConnection(databasePath, (connection) => {
      const fileRows = readRowsSync(
        connection,
        'MATCH (entry:FileAnalysis) RETURN entry.filePath AS filePath, entry.mtime AS mtime, entry.size AS size, entry.analysis AS analysis ORDER BY entry.filePath',
      );
      const symbolRows = readRowsSync(
        connection,
        'MATCH (entry:Symbol) RETURN entry.symbolId AS symbolId, entry.filePath AS filePath, entry.name AS name, entry.kind AS kind, entry.signature AS signature, entry.rangeJson AS rangeJson, entry.metadataJson AS metadataJson ORDER BY entry.filePath, entry.symbolId',
      ) as SymbolRow[];
      const relationRows = readRowsSync(
        connection,
        'MATCH (entry:Relation) RETURN entry.relationId AS relationId, entry.filePath AS filePath, entry.kind AS kind, entry.pluginId AS pluginId, entry.sourceId AS sourceId, entry.fromFilePath AS fromFilePath, entry.toFilePath AS toFilePath, entry.fromNodeId AS fromNodeId, entry.toNodeId AS toNodeId, entry.fromSymbolId AS fromSymbolId, entry.toSymbolId AS toSymbolId, entry.specifier AS specifier, entry.relationType AS relationType, entry.variant AS variant, entry.resolvedPath AS resolvedPath, entry.metadataJson AS metadataJson ORDER BY entry.filePath, entry.relationId',
      ) as RelationRow[];

      return {
        files: fileRows.flatMap((row) => {
          const entry = createSnapshotFileEntry(row);
          return entry ? [entry] : [];
        }),
        symbols: symbolRows.flatMap((row) => {
          const entry = createSnapshotSymbolEntry(row);
          return entry ? [entry] : [];
        }),
        relations: relationRows.flatMap((row) => {
          const entry = createSnapshotRelationEntry(row);
          return entry ? [entry] : [];
        }),
      };
    });
  } catch (error) {
    console.warn('[CodeGraphy] Failed to read structured analysis snapshot.', error);
    return { files: [], symbols: [], relations: [] };
  }
}

export function saveWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  cache: IWorkspaceAnalysisCache,
): void {
  ensureDatabaseDirectory(workspaceRoot);
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(path.dirname(databasePath))) {
    return;
  }

  withConnection(databasePath, (connection) => {
    runStatementSync(connection, 'MATCH (entry:FileAnalysis) DELETE entry');
    runStatementSync(connection, 'MATCH (entry:Symbol) DELETE entry');
    runStatementSync(connection, 'MATCH (entry:Relation) DELETE entry');

    for (const [filePath, entry] of sortedCacheEntries(cache)) {
      persistAnalysisEntry(connection, filePath, entry);
    }
  });
}

export function clearWorkspaceAnalysisDatabaseCache(workspaceRoot: string): void {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return;
  }

  withConnection(databasePath, (connection) => {
    runStatementSync(connection, 'MATCH (entry:FileAnalysis) DELETE entry');
    runStatementSync(connection, 'MATCH (entry:Symbol) DELETE entry');
    runStatementSync(connection, 'MATCH (entry:Relation) DELETE entry');
  });
}
