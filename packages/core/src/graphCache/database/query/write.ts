import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
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
const DELETE_FILE_ANALYSIS_STATEMENT = 'DELETE FROM FileAnalysis WHERE filePath = @filePath';
const DELETE_SYMBOL_STATEMENT = 'DELETE FROM Symbol WHERE filePath = @filePath';
const DELETE_RELATION_STATEMENT = 'DELETE FROM Relation WHERE filePath = @filePath';

export interface WorkspaceAnalysisCacheWriter {
  connection: SQLiteConnection;
  fileAnalysisStatement: SQLiteStatement;
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
  return {
    filePath,
    mtime: entry.mtime ?? 0,
    size: entry.size ?? 0,
    contentHash: entry.contentHash ?? null,
    analysis: JSON.stringify(entry.analysis),
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
  const fileAnalysisStatement = await prepareStatementAsync(connection, CREATE_FILE_ANALYSIS_STATEMENT);
  return {
    connection,
    fileAnalysisStatement,
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

}
