import * as fs from 'node:fs';
import {
  createEmptyWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
  type IWorkspaceAnalysisCache,
} from '../../../analysis/cache';
import {
  projectAnalysisForCacheTiers,
  markAnalysisCacheTiers,
  readAnalysisCacheTiers,
  type AnalysisCacheTier,
} from '../../../analysis/fileAnalysis/cacheTiers';
import { readRowsAsync, readRowsSync, withConnection, withConnectionAsync } from './connection';
import { clearDatabaseArtifacts, getWorkspaceAnalysisDatabasePath } from './paths';
import type { FileRow, GraphEdgeRow, GraphNodeRow } from '../records/types';
import { parseDatabaseRecords } from '../records/parser';
import { EDGE_ROWS_QUERY, FILE_ROWS_QUERY, NODE_ROWS_QUERY } from '../query/read';

export interface WorkspaceAnalysisDatabaseLoadOptions {
  activeAnalysisCacheTiers?: readonly AnalysisCacheTier[];
}

function createCache(
  fileRows: readonly FileRow[],
  nodeRows: readonly GraphNodeRow[],
  edgeRows: readonly GraphEdgeRow[],
  options: WorkspaceAnalysisDatabaseLoadOptions,
): IWorkspaceAnalysisCache {
  const hydrated = parseDatabaseRecords(fileRows, nodeRows, edgeRows);
  const cache: IWorkspaceAnalysisCache = {
    version: WORKSPACE_ANALYSIS_CACHE_VERSION,
    files: {},
  };
  for (const entry of hydrated.files) {
    const projectedAnalysis = projectAnalysisForCacheTiers(
      entry.analysis,
      options.activeAnalysisCacheTiers,
    );
    const analysis = readAnalysisCacheTiers(projectedAnalysis).length > 0
      ? markAnalysisCacheTiers(projectedAnalysis, options.activeAnalysisCacheTiers)
      : projectedAnalysis;
    cache.files[entry.filePath] = {
      mtime: entry.mtime,
      ...(entry.size !== undefined ? { size: entry.size } : {}),
      ...(entry.contentHash ? { contentHash: entry.contentHash } : {}),
      analysis,
    };
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
    return withConnection(databasePath, connection => createCache(
      readRowsSync(connection, FILE_ROWS_QUERY) as FileRow[],
      readRowsSync(connection, NODE_ROWS_QUERY) as GraphNodeRow[],
      readRowsSync(connection, EDGE_ROWS_QUERY) as GraphEdgeRow[],
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
    return await withConnectionAsync(databasePath, async connection => {
      const [fileRows, nodeRows, edgeRows] = await Promise.all([
        readRowsAsync(connection, FILE_ROWS_QUERY),
        readRowsAsync(connection, NODE_ROWS_QUERY),
        readRowsAsync(connection, EDGE_ROWS_QUERY),
      ]);
      return createCache(
        fileRows as FileRow[],
        nodeRows as GraphNodeRow[],
        edgeRows as GraphEdgeRow[],
        options,
      );
    });
  } catch (error) {
    return recoverUnreadableDatabase(databasePath, error);
  }
}

export { WORKSPACE_ANALYSIS_CACHE_VERSION };
