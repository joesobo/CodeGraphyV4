import type * as lb from '@ladybugdb/core';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import {
  executeStatementAsync,
  executeStatementSync,
  prepareStatementAsync,
  prepareStatementSync,
} from '../io/connection';

const CREATE_FILE_ANALYSIS_STATEMENT = 'CREATE (entry:FileAnalysis {filePath: $filePath, mtime: $mtime, size: $size, analysis: $analysis})';
const DELETE_FILE_ANALYSIS_STATEMENT = 'MATCH (entry:FileAnalysis {filePath: $filePath}) DELETE entry';
const DELETE_SYMBOL_STATEMENT = 'MATCH (entry:Symbol {filePath: $filePath}) DELETE entry';
const DELETE_RELATION_STATEMENT = 'MATCH (entry:Relation {filePath: $filePath}) DELETE entry';

export interface WorkspaceAnalysisCacheWriter {
  connection: lb.Connection;
  fileAnalysisStatement: lb.PreparedStatement;
}

export interface WorkspaceAnalysisCachePatchWriter extends WorkspaceAnalysisCacheWriter {
  deleteFileAnalysisStatement: lb.PreparedStatement;
  deleteSymbolStatement: lb.PreparedStatement;
  deleteRelationStatement: lb.PreparedStatement;
}

function createFileAnalysisParams(
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): Record<string, lb.LbugValue> {
  return {
    filePath,
    mtime: entry.mtime ?? 0,
    size: entry.size ?? 0,
    analysis: JSON.stringify(entry.analysis),
  };
}

export function sortedCacheEntries(
  cache: IWorkspaceAnalysisCache,
): Array<[string, IWorkspaceAnalysisCache['files'][string]]> {
  return Object.entries(cache.files).sort(([left], [right]) => left.localeCompare(right));
}

export function createWorkspaceAnalysisCacheWriter(
  connection: lb.Connection,
): WorkspaceAnalysisCacheWriter {
  return {
    connection,
    fileAnalysisStatement: prepareStatementSync(connection, CREATE_FILE_ANALYSIS_STATEMENT),
  };
}

export function createWorkspaceAnalysisCachePatchWriter(
  connection: lb.Connection,
): WorkspaceAnalysisCachePatchWriter {
  return {
    ...createWorkspaceAnalysisCacheWriter(connection),
    deleteFileAnalysisStatement: prepareStatementSync(connection, DELETE_FILE_ANALYSIS_STATEMENT),
    deleteSymbolStatement: prepareStatementSync(connection, DELETE_SYMBOL_STATEMENT),
    deleteRelationStatement: prepareStatementSync(connection, DELETE_RELATION_STATEMENT),
  };
}

export async function createWorkspaceAnalysisCacheWriterAsync(
  connection: lb.Connection,
): Promise<WorkspaceAnalysisCacheWriter> {
  const fileAnalysisStatement = await prepareStatementAsync(connection, CREATE_FILE_ANALYSIS_STATEMENT);
  return {
    connection,
    fileAnalysisStatement,
  };
}

export async function createWorkspaceAnalysisCachePatchWriterAsync(
  connection: lb.Connection,
): Promise<WorkspaceAnalysisCachePatchWriter> {
  const [
    fileAnalysisStatement,
    deleteFileAnalysisStatement,
    deleteSymbolStatement,
    deleteRelationStatement,
  ] = await Promise.all([
    prepareStatementAsync(connection, CREATE_FILE_ANALYSIS_STATEMENT),
    prepareStatementAsync(connection, DELETE_FILE_ANALYSIS_STATEMENT),
    prepareStatementAsync(connection, DELETE_SYMBOL_STATEMENT),
    prepareStatementAsync(connection, DELETE_RELATION_STATEMENT),
  ]);
  return {
    connection,
    fileAnalysisStatement,
    deleteFileAnalysisStatement,
    deleteSymbolStatement,
    deleteRelationStatement,
  };
}

export function persistAnalysisEntry(
  writer: WorkspaceAnalysisCacheWriter,
  filePath: string,
  entry: IWorkspaceAnalysisCache['files'][string],
): void {
  executeStatementSync(writer.connection, writer.fileAnalysisStatement, createFileAnalysisParams(filePath, entry));
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

export async function deleteAnalysisEntryAsync(
  writer: WorkspaceAnalysisCachePatchWriter,
  filePath: string,
): Promise<void> {
  const params = { filePath };
  await executeStatementAsync(writer.connection, writer.deleteFileAnalysisStatement, params);
  await executeStatementAsync(writer.connection, writer.deleteSymbolStatement, params);
  await executeStatementAsync(writer.connection, writer.deleteRelationStatement, params);
}

async function executeStatementAndYield(
  writer: WorkspaceAnalysisCacheWriter,
  preparedStatement: lb.PreparedStatement,
  params: Record<string, lb.LbugValue>,
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

}
