import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import { runStatementSync, withConnection } from './connection';
import { ensureDatabaseDirectory, getWorkspaceAnalysisDatabasePath } from './paths';
import {
  createWorkspaceAnalysisCachePatchWriter,
  createWorkspaceAnalysisCacheWriter,
  deleteAnalysisEntry,
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

export interface WorkspaceAnalysisDatabasePatch {
  deleteFilePaths?: readonly string[];
  upsertFiles?: IWorkspaceAnalysisCache['files'];
}

function runTransactionSync(connection: Parameters<typeof runStatementSync>[0], patch: () => void): void {
  runStatementSync(connection, 'BEGIN TRANSACTION');
  let committed = false;

  try {
    patch();
    runStatementSync(connection, 'COMMIT');
    committed = true;
  } catch (error) {
    if (!committed) {
      try {
        runStatementSync(connection, 'ROLLBACK');
      } catch {
        // Keep the original patch failure as the actionable error.
      }
    }
    throw error;
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
  const tempDatabasePath = createTemporaryDatabasePath(databasePath);

  try {
    withConnection(tempDatabasePath, (connection) => {
      runTransactionSync(connection, () => {
        runStatementSync(connection, 'DELETE FROM FileAnalysis');
        runStatementSync(connection, 'DELETE FROM Symbol');
        runStatementSync(connection, 'DELETE FROM Relation');

        const writer = createWorkspaceAnalysisCacheWriter(connection);
        for (const [filePath, entry] of sortedCacheEntries(cache)) {
          persistAnalysisEntry(writer, filePath, entry);
        }
      });
    });
    replaceDatabaseCache(tempDatabasePath, databasePath);
  } catch (error) {
    try {
      cleanupTemporaryDatabase(tempDatabasePath);
    } catch {
      // Preserve the original save or replacement failure.
    }
    throw error;
  }
}

export function patchWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  patch: WorkspaceAnalysisDatabasePatch,
): void {
  ensureDatabaseDirectory(workspaceRoot);
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(path.dirname(databasePath))) {
    return;
  }

  const deleteFilePaths = new Set([
    ...(patch.deleteFilePaths ?? []),
    ...Object.keys(patch.upsertFiles ?? {}),
  ]);

  withConnection(databasePath, (connection) => {
    runTransactionSync(connection, () => {
      const writer = createWorkspaceAnalysisCachePatchWriter(connection);
      for (const filePath of [...deleteFilePaths].sort()) {
        deleteAnalysisEntry(writer, filePath);
      }
      for (const [filePath, entry] of sortedCacheEntries({
        version: '',
        files: patch.upsertFiles ?? {},
      })) {
        persistAnalysisEntry(writer, filePath, entry);
      }
    });
  });
}

export function clearWorkspaceAnalysisDatabaseCache(workspaceRoot: string): void {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return;
  }

  withConnection(databasePath, (connection) => {
    runStatementSync(connection, 'DELETE FROM FileAnalysis');
    runStatementSync(connection, 'DELETE FROM Symbol');
    runStatementSync(connection, 'DELETE FROM Relation');
  });
}
