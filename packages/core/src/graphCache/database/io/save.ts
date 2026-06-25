import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import { runStatementSync, withConnection } from './connection';
import { ensureDatabaseDirectory, getWorkspaceAnalysisDatabasePath } from './paths';
import {
  createWorkspaceAnalysisCacheWriter,
  persistAnalysisEntry,
  sortedCacheEntries,
} from '../query/write';
import {
  cleanupTemporaryDatabase,
  createTemporaryDatabasePath,
  replaceDatabaseCache,
} from './temporary';

export { saveWorkspaceAnalysisDatabaseCacheAsync } from './saveAsync';

export interface WorkspaceAnalysisDatabaseSaveProgress {
  current: number;
  total: number;
}

export interface WorkspaceAnalysisDatabaseSaveOptions {
  onProgress?: (progress: WorkspaceAnalysisDatabaseSaveProgress) => void;
  yieldEvery?: number;
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
  const tempDatabasePath = createTemporaryDatabasePath(databasePath);

  try {
    withConnection(tempDatabasePath, (connection) => {
      runStatementSync(connection, 'MATCH (entry:FileAnalysis) DELETE entry');
      runStatementSync(connection, 'MATCH (entry:Symbol) DELETE entry');
      runStatementSync(connection, 'MATCH (entry:Relation) DELETE entry');

      const writer = createWorkspaceAnalysisCacheWriter(connection);
      for (const [filePath, entry] of sortedCacheEntries(cache)) {
        persistAnalysisEntry(writer, filePath, entry);
      }
    });
    replaceDatabaseCache(tempDatabasePath, databasePath);
  } catch (error) {
    cleanupTemporaryDatabase(tempDatabasePath);
    throw error;
  }
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
