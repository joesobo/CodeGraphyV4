import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import {
  executeStatementAsync,
  executeStatementSync,
  prepareStatementAsync,
  prepareStatementSync,
} from '../io/connection';
import type {
  SQLiteConnection,
  SQLiteStatement,
  SQLiteValue,
} from '../io/connection';

const CREATE_FILE_ANALYSIS_STATEMENT = 'INSERT INTO FileAnalysis(filePath, mtime, size, contentHash, analysis) VALUES (@filePath, @mtime, @size, @contentHash, @analysis)';
const CREATE_SYMBOL_STATEMENT = 'INSERT INTO Symbol(symbolId, filePath, name, kind, signature, rangeJson, metadataJson) VALUES (@symbolId, @filePath, @name, @kind, @signature, @rangeJson, @metadataJson)';
const CREATE_RELATION_STATEMENT = 'INSERT INTO Relation(relationId, filePath, kind, pluginId, sourceId, fromFilePath, toFilePath, fromNodeId, toNodeId, fromSymbolId, toSymbolId, specifier, relationType, variant, resolvedPath, metadataJson) VALUES (@relationId, @filePath, @kind, @pluginId, @sourceId, @fromFilePath, @toFilePath, @fromNodeId, @toNodeId, @fromSymbolId, @toSymbolId, @specifier, @relationType, @variant, @resolvedPath, @metadataJson)';
const DELETE_FILE_ANALYSIS_STATEMENT = 'DELETE FROM FileAnalysis WHERE filePath = @filePath';
const DELETE_SYMBOL_STATEMENT = 'DELETE FROM Symbol WHERE filePath = @filePath';
const DELETE_RELATION_STATEMENT = 'DELETE FROM Relation WHERE filePath = @filePath';

export interface WorkspaceAnalysisCacheWriter {
  connection: SQLiteConnection;
  fileAnalysisStatement: SQLiteStatement;
  symbolStatement: SQLiteStatement;
  relationStatement: SQLiteStatement;
}

export interface WorkspaceAnalysisCachePatchWriter extends WorkspaceAnalysisCacheWriter {
  deleteFileAnalysisStatement: SQLiteStatement;
  deleteSymbolStatement: SQLiteStatement;
  deleteRelationStatement: SQLiteStatement;
}

function createFileAnalysisParams(
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): Record<string, SQLiteValue> {
  const analysis = { ...entry.analysis };
  if ((analysis.symbols?.length ?? 0) > 0) delete analysis.symbols;
  if ((analysis.relations?.length ?? 0) > 0) delete analysis.relations;
  return {
    filePath,
    mtime: entry.mtime ?? 0,
    size: entry.size ?? 0,
    contentHash: entry.contentHash ?? null,
    analysis: JSON.stringify(analysis),
  };
}

function optionalJson(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value);
}

function createSymbolParams(filePath: string, symbol: IAnalysisSymbol): Record<string, SQLiteValue> {
  return {
    symbolId: symbol.id,
    filePath,
    name: symbol.name,
    kind: symbol.kind,
    signature: symbol.signature ?? null,
    rangeJson: optionalJson(symbol.range),
    metadataJson: optionalJson(symbol.metadata),
  };
}

function createRelationParams(
  filePath: string,
  relation: IAnalysisRelation,
  index: number,
): Record<string, SQLiteValue> {
  return {
    relationId: `${filePath}:${index}`,
    filePath,
    kind: relation.kind,
    pluginId: relation.pluginId ?? null,
    sourceId: relation.sourceId,
    fromFilePath: relation.fromFilePath ?? null,
    toFilePath: relation.toFilePath ?? null,
    fromNodeId: relation.fromNodeId ?? null,
    toNodeId: relation.toNodeId ?? null,
    fromSymbolId: relation.fromSymbolId ?? null,
    toSymbolId: relation.toSymbolId ?? null,
    specifier: relation.specifier ?? null,
    relationType: relation.type ?? null,
    variant: relation.variant ?? null,
    resolvedPath: relation.resolvedPath ?? null,
    metadataJson: optionalJson(relation.metadata),
  };
}

export function sortedCacheEntries(
  cache: IWorkspaceAnalysisCache,
): Array<[string, IWorkspaceAnalysisCache['files'][string]]> {
  return Object.entries(cache.files).sort(([left], [right]) => left.localeCompare(right));
}

export function createWorkspaceAnalysisCacheWriter(
  connection: SQLiteConnection,
): WorkspaceAnalysisCacheWriter {
  return {
    connection,
    fileAnalysisStatement: prepareStatementSync(connection, CREATE_FILE_ANALYSIS_STATEMENT),
    symbolStatement: prepareStatementSync(connection, CREATE_SYMBOL_STATEMENT),
    relationStatement: prepareStatementSync(connection, CREATE_RELATION_STATEMENT),
  };
}

export function createWorkspaceAnalysisCachePatchWriter(
  connection: SQLiteConnection,
): WorkspaceAnalysisCachePatchWriter {
  return {
    ...createWorkspaceAnalysisCacheWriter(connection),
    deleteFileAnalysisStatement: prepareStatementSync(connection, DELETE_FILE_ANALYSIS_STATEMENT),
    deleteSymbolStatement: prepareStatementSync(connection, DELETE_SYMBOL_STATEMENT),
    deleteRelationStatement: prepareStatementSync(connection, DELETE_RELATION_STATEMENT),
  };
}

export async function createWorkspaceAnalysisCacheWriterAsync(
  connection: SQLiteConnection,
): Promise<WorkspaceAnalysisCacheWriter> {
  const [fileAnalysisStatement, symbolStatement, relationStatement] = await Promise.all([
    prepareStatementAsync(connection, CREATE_FILE_ANALYSIS_STATEMENT),
    prepareStatementAsync(connection, CREATE_SYMBOL_STATEMENT),
    prepareStatementAsync(connection, CREATE_RELATION_STATEMENT),
  ]);
  return {
    connection,
    fileAnalysisStatement,
    symbolStatement,
    relationStatement,
  };
}

export function persistAnalysisEntry(
  writer: WorkspaceAnalysisCacheWriter,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): void {
  executeStatementSync(writer.connection, writer.fileAnalysisStatement, createFileAnalysisParams(filePath, entry));
  for (const symbol of entry.analysis.symbols ?? []) {
    executeStatementSync(writer.connection, writer.symbolStatement, createSymbolParams(filePath, symbol));
  }
  for (const [index, relation] of (entry.analysis.relations ?? []).entries()) {
    executeStatementSync(writer.connection, writer.relationStatement, createRelationParams(filePath, relation, index));
  }
}

export function deleteAnalysisEntry(
  writer: WorkspaceAnalysisCachePatchWriter,
  filePath: string,
): void {
  const params = { filePath };
  executeStatementSync(writer.connection, writer.deleteFileAnalysisStatement, params);
  executeStatementSync(writer.connection, writer.deleteSymbolStatement, params);
  executeStatementSync(writer.connection, writer.deleteRelationStatement, params);
}

async function executeStatementAndYield(
  writer: WorkspaceAnalysisCacheWriter,
  preparedStatement: SQLiteStatement,
  params: Record<string, SQLiteValue>,
  afterStatement: () => Promise<void>,
): Promise<void> {
  await executeStatementAsync(writer.connection, preparedStatement, params);
  await afterStatement();
}

export async function persistAnalysisEntryAsync(
  writer: WorkspaceAnalysisCacheWriter,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
  afterStatement: () => Promise<void>,
): Promise<void> {
  await executeStatementAndYield(
    writer,
    writer.fileAnalysisStatement,
    createFileAnalysisParams(filePath, entry),
    afterStatement,
  );
  for (const symbol of entry.analysis.symbols ?? []) {
    await executeStatementAndYield(
      writer,
      writer.symbolStatement,
      createSymbolParams(filePath, symbol),
      afterStatement,
    );
  }
  for (const [index, relation] of (entry.analysis.relations ?? []).entries()) {
    await executeStatementAndYield(
      writer,
      writer.relationStatement,
      createRelationParams(filePath, relation, index),
      afterStatement,
    );
  }
}
