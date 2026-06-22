import type * as lb from '@ladybugdb/core';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import {
  executeStatementAsync,
  executeStatementSync,
  prepareStatementAsync,
  prepareStatementSync,
} from '../io/connection';

const CREATE_FILE_ANALYSIS_STATEMENT = 'CREATE (entry:FileAnalysis {filePath: $filePath, mtime: $mtime, size: $size, analysis: $analysis})';

export interface WorkspaceAnalysisCacheWriter {
  connection: lb.Connection;
  fileAnalysisStatement: lb.PreparedStatement;
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

export async function createWorkspaceAnalysisCacheWriterAsync(
  connection: lb.Connection,
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
