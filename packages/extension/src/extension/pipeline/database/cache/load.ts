import * as fs from 'node:fs';
import {
  createEmptyWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
  type IWorkspaceAnalysisCache,
} from '../../cache';
import { readRowsSync, withConnection } from './connection';
import { clearDatabaseArtifacts, getWorkspaceAnalysisDatabasePath } from './paths';
import { createSnapshotFileEntry } from './rows';
import { FILE_ANALYSIS_ROWS_QUERY } from './queries';

export function loadWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
): IWorkspaceAnalysisCache {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return createEmptyWorkspaceAnalysisCache();
  }

  try {
    return withConnection(databasePath, (connection) => {
      const rows = readRowsSync(connection, FILE_ANALYSIS_ROWS_QUERY);
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
