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
import type { IndexedFileRow } from '../records/contracts';
import { INDEXED_FILE_ROWS_QUERY } from '../query/read';

export interface WorkspaceAnalysisDatabaseLoadOptions {
  activeAnalysisCacheTiers?: readonly AnalysisCacheTier[];
}

function addSnapshotEntryToCache(
  cache: IWorkspaceAnalysisCache,
  row: IndexedFileRow,
  options: WorkspaceAnalysisDatabaseLoadOptions,
): void {
  const entry = createSnapshotFileEntry(row);
  if (!entry) return;
  cache.files[entry.filePath] = {
    mtime: entry.mtime,
    ...(entry.size !== undefined ? { size: entry.size } : {}),
    ...(entry.contentHash ? { contentHash: entry.contentHash } : {}),
    analysis: projectAnalysisForCacheTiers(
      entry.analysis,
      options.activeAnalysisCacheTiers,
    ),
  };
}

function createCacheFromRows(
  rows: readonly IndexedFileRow[],
  options: WorkspaceAnalysisDatabaseLoadOptions,
): IWorkspaceAnalysisCache {
  const cache: IWorkspaceAnalysisCache = {
    version: WORKSPACE_ANALYSIS_CACHE_VERSION,
    files: {},
  };
  for (const row of rows) {
    try {
      addSnapshotEntryToCache(cache, row, options);
    } catch (error) {
      console.warn('[CodeGraphy] Skipping unreadable persisted analysis row.', error);
    }
  }
  return cache;
}

function recoverUnreadableDatabase(databasePath: string, error: unknown): IWorkspaceAnalysisCache {
  console.warn('[CodeGraphy] Failed to read persisted analysis database. Rebuilding cache.', error);
  clearDatabaseArtifacts(databasePath);
  return createEmptyWorkspaceAnalysisCache();
}

export function loadWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  options: WorkspaceAnalysisDatabaseLoadOptions = {},
): IWorkspaceAnalysisCache {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return createEmptyWorkspaceAnalysisCache();
  try {
    return withConnection(databasePath, connection => createCacheFromRows(
      readRowsSync(connection, INDEXED_FILE_ROWS_QUERY) as IndexedFileRow[],
      options,
    ));
  } catch (error) {
    return recoverUnreadableDatabase(databasePath, error);
  }
}

export async function loadWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
  options: WorkspaceAnalysisDatabaseLoadOptions = {},
): Promise<IWorkspaceAnalysisCache> {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return createEmptyWorkspaceAnalysisCache();
  try {
    return await withConnectionAsync(databasePath, async connection => createCacheFromRows(
      await readRowsAsync(connection, INDEXED_FILE_ROWS_QUERY) as IndexedFileRow[],
      options,
    ));
  } catch (error) {
    return recoverUnreadableDatabase(databasePath, error);
  }
}

export { WORKSPACE_ANALYSIS_CACHE_VERSION };
