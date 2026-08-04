import * as fs from 'node:fs';
import {
  createEmptyWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
  type IWorkspaceAnalysisCache,
} from '../../../analysis/cache';
import {
  projectAnalysisForCacheTiers,
  markAnalysisCacheTiers,
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  type AnalysisCacheTier,
} from '../../../analysis/fileAnalysis/cacheTiers';
import {
  readRowsAsync,
  readRowsSync,
  withReadOnlyConnection,
  withRecreatedConnection,
  withRecreatedConnectionAsync,
} from './connection';
import { getWorkspaceAnalysisDatabasePath } from './paths';
import type { FileRow, GraphEdgeRow, GraphNodeRow, SymbolRow } from '../records/types';
import { parseDatabaseRecords } from '../records/parser';
import { EDGE_ROWS_QUERY, FILE_ROWS_QUERY, NODE_ROWS_QUERY, SYMBOL_ROWS_QUERY } from '../query/read';

export interface WorkspaceAnalysisDatabaseLoadOptions {
  activeAnalysisCacheTiers?: readonly AnalysisCacheTier[];
  unreadable?: 'empty' | 'throw';
}

export class WorkspaceAnalysisDatabaseUnreadableError extends Error {
  readonly name = 'WorkspaceAnalysisDatabaseUnreadableError';

  constructor(readonly cause: unknown) {
    super('The Graph Cache could not be read safely.');
  }
}

function createCache(
  fileRows: readonly FileRow[],
  nodeRows: readonly GraphNodeRow[],
  symbolRows: readonly SymbolRow[],
  edgeRows: readonly GraphEdgeRow[],
  options: WorkspaceAnalysisDatabaseLoadOptions,
  workspaceRoot: string,
): IWorkspaceAnalysisCache {
  const hydrated = parseDatabaseRecords(fileRows, nodeRows, symbolRows, edgeRows, workspaceRoot);
  const cache: IWorkspaceAnalysisCache = {
    version: WORKSPACE_ANALYSIS_CACHE_VERSION,
    files: {},
  };
  for (const entry of hydrated.files) {
    const projectedAnalysis = projectAnalysisForCacheTiers(
      entry.analysis,
      options.activeAnalysisCacheTiers,
    );
    const completedTiers = options.activeAnalysisCacheTiers ?? [
      BASELINE_ANALYSIS_CACHE_TIER,
      SYMBOLS_ANALYSIS_CACHE_TIER,
    ];
    const analysis = markAnalysisCacheTiers(projectedAnalysis, completedTiers);
    cache.files[entry.filePath] = {
      mtime: entry.mtime,
      ...(entry.size !== undefined ? { size: entry.size } : {}),
      ...(entry.contentHash ? { contentHash: entry.contentHash } : {}),
      analysis,
    };
  }
  return cache;
}

function reportUnreadableDatabase(error: unknown): IWorkspaceAnalysisCache {
  console.warn('[CodeGraphy] Failed to read persisted analysis database. Rebuilding cache.', error);
  return createEmptyWorkspaceAnalysisCache();
}

export function loadWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  options: WorkspaceAnalysisDatabaseLoadOptions = {},
): IWorkspaceAnalysisCache {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return createEmptyWorkspaceAnalysisCache();
  try {
    const load = options.unreadable === 'throw'
      ? withReadOnlyConnection
      : withRecreatedConnection;
    return load(databasePath, connection => createCache(
      readRowsSync(connection, FILE_ROWS_QUERY) as FileRow[],
      readRowsSync(connection, NODE_ROWS_QUERY) as GraphNodeRow[],
      readRowsSync(connection, SYMBOL_ROWS_QUERY) as SymbolRow[],
      readRowsSync(connection, EDGE_ROWS_QUERY) as GraphEdgeRow[],
      options,
      workspaceRoot,
    ));
  } catch (error) {
    if (options.unreadable === 'throw') {
      throw new WorkspaceAnalysisDatabaseUnreadableError(error);
    }
    return reportUnreadableDatabase(error);
  }
}

export async function loadWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
  options: WorkspaceAnalysisDatabaseLoadOptions = {},
): Promise<IWorkspaceAnalysisCache> {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) return createEmptyWorkspaceAnalysisCache();
  if (options.unreadable === 'throw') {
    return loadWorkspaceAnalysisDatabaseCache(workspaceRoot, options);
  }
  try {
    return await withRecreatedConnectionAsync(databasePath, async connection => {
      const [fileRows, nodeRows, symbolRows, edgeRows] = await Promise.all([
        readRowsAsync(connection, FILE_ROWS_QUERY),
        readRowsAsync(connection, NODE_ROWS_QUERY),
        readRowsAsync(connection, SYMBOL_ROWS_QUERY),
        readRowsAsync(connection, EDGE_ROWS_QUERY),
      ]);
      return createCache(
        fileRows as FileRow[],
        nodeRows as GraphNodeRow[],
        symbolRows as SymbolRow[],
        edgeRows as GraphEdgeRow[],
        options,
        workspaceRoot,
      );
    });
  } catch (error) {
    return reportUnreadableDatabase(error);
  }
}

export { WORKSPACE_ANALYSIS_CACHE_VERSION };
