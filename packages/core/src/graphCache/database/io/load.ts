import * as fs from 'node:fs';
import {
  createEmptyWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
  type IWorkspaceAnalysisCache,
} from '../../../analysis/cache';
import {
  projectAnalysisForCacheTiers,
  type AnalysisCacheTier,
} from '../../../analysis/fileAnalysis/cacheTiers';
import { readRowsAsync, readRowsSync, withConnection, withConnectionAsync } from './connection';
import { clearDatabaseArtifacts, getWorkspaceAnalysisDatabasePath } from './paths';
import { createSnapshotFileEntry } from '../records/file';
import { FILE_ANALYSIS_ROWS_QUERY } from '../query/read';

export interface WorkspaceAnalysisDatabaseLoadOptions {
  activeAnalysisCacheTiers?: readonly AnalysisCacheTier[];
}

function addSnapshotEntryToCache(
  cache: IWorkspaceAnalysisCache,
  row: Parameters<typeof createSnapshotFileEntry>[0],
  options: WorkspaceAnalysisDatabaseLoadOptions,
): void {
  const entry = createSnapshotFileEntry(row);
  if (!entry) {
    return;
  }

  cache.files[entry.filePath] = {
    mtime: entry.mtime,
    size: entry.size,
    ...(entry.contentHash ? { contentHash: entry.contentHash } : {}),
    analysis: projectAnalysisForCacheTiers(
      entry.analysis,
      options.activeAnalysisCacheTiers,
    ),
  };
}

export function loadWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  options: WorkspaceAnalysisDatabaseLoadOptions = {},
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
          addSnapshotEntryToCache(cache, row, options);
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

export async function loadWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
  options: WorkspaceAnalysisDatabaseLoadOptions = {},
): Promise<IWorkspaceAnalysisCache> {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return createEmptyWorkspaceAnalysisCache();
  }

  try {
    return await withConnectionAsync(databasePath, async (connection) => {
      const rows = await readRowsAsync(connection, FILE_ANALYSIS_ROWS_QUERY);
      const cache = createEmptyWorkspaceAnalysisCache();

      for (const row of rows) {
        try {
          addSnapshotEntryToCache(cache, row, options);
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
