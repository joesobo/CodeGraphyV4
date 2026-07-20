import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import type { IGraphData } from '../../../graph/contracts';
import {
  recreateInvalidDatabase,
  runStatementSync,
  withConnection,
} from './connection';
import { ensureDatabaseDirectory, getWorkspaceAnalysisDatabasePath } from './paths';
import { loadWorkspaceAnalysisDatabaseCache } from './load';
import {
  createWorkspaceAnalysisCacheWriter,
  persistWorkspaceCache,
} from '../query/write';

export { saveWorkspaceAnalysisDatabaseCacheAsync } from './saveAsync';

export interface WorkspaceAnalysisDatabaseSaveProgress {
  current: number;
  total: number;
}

export interface WorkspaceAnalysisDatabaseSaveOptions {
  graph?: IGraphData;
  onProgress?: (progress: WorkspaceAnalysisDatabaseSaveProgress) => void;
  yieldEvery?: number;
}

export interface WorkspaceAnalysisDatabasePatch {
  deleteFilePaths?: readonly string[];
  upsertFiles?: IWorkspaceAnalysisCache['files'];
  graph?: IGraphData;
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
  graph?: IGraphData,
): void {
  ensureDatabaseDirectory(workspaceRoot);
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(path.dirname(databasePath))) {
    return;
  }
  const persist = (): void => {
    withConnection(databasePath, (connection) => {
      runTransactionSync(connection, () => {
        runStatementSync(connection, 'DELETE FROM Edge');
        runStatementSync(connection, 'DELETE FROM Node');
        runStatementSync(connection, 'DELETE FROM File');

        const writer = createWorkspaceAnalysisCacheWriter(connection);
        persistWorkspaceCache(writer, cache, graph);
      });
    });
  };

  try {
    persist();
  } catch (error) {
    if (!recreateInvalidDatabase(databasePath, error)) {
      throw error;
    }
    persist();
  }
}

export function patchWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  patch: WorkspaceAnalysisDatabasePatch,
): void {
  const cache = loadWorkspaceAnalysisDatabaseCache(workspaceRoot);
  for (const filePath of patch.deleteFilePaths ?? []) {
    delete cache.files[filePath];
  }
  Object.assign(cache.files, patch.upsertFiles ?? {});
  saveWorkspaceAnalysisDatabaseCache(workspaceRoot, cache, patch.graph);
}

export function clearWorkspaceAnalysisDatabaseCache(workspaceRoot: string): void {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return;
  }

  withConnection(databasePath, (connection) => {
    runStatementSync(connection, 'DELETE FROM Edge');
    runStatementSync(connection, 'DELETE FROM Node');
    runStatementSync(connection, 'DELETE FROM File');
  });
}
