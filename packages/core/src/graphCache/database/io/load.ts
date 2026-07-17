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
import { createSnapshotSymbolEntry } from '../records/symbol';
import { createSnapshotRelationEntry } from '../relation/entry';
import type { RelationRow, SymbolRow } from '../records/contracts';
import {
  FILE_ANALYSIS_ROWS_QUERY,
  RELATION_ROWS_QUERY,
  SYMBOL_ROWS_QUERY,
} from '../query/read';

export interface WorkspaceAnalysisDatabaseLoadOptions {
  activeAnalysisCacheTiers?: readonly AnalysisCacheTier[];
}

class LegacyGraphCacheError extends Error {}

function containsEmbeddedStructuredAnalysis(
  rows: readonly Parameters<typeof createSnapshotFileEntry>[0][],
): boolean {
  return rows.some((row) => {
    if (typeof row.analysis !== 'string') return false;
    try {
      const analysis = JSON.parse(row.analysis) as {
        symbols?: unknown[];
        relations?: unknown[];
      };
      return (analysis.symbols?.length ?? 0) > 0
        || (analysis.relations?.length ?? 0) > 0;
    } catch {
      return false;
    }
  });
}

function addSnapshotEntryToCache(
  cache: IWorkspaceAnalysisCache,
  row: Parameters<typeof createSnapshotFileEntry>[0],
  symbolRows: readonly SymbolRow[],
  relationRows: readonly RelationRow[],
  options: WorkspaceAnalysisDatabaseLoadOptions,
): void {
  const entry = createSnapshotFileEntry(row);
  if (!entry) {
    return;
  }

  const analysisFilePath = entry.analysis.filePath ?? entry.filePath;
  const symbols = symbolRows
    .filter(symbol => symbol.filePath === entry.filePath)
    .flatMap((row) => {
      const symbol = createSnapshotSymbolEntry(row);
      return symbol ? [{ ...symbol, filePath: analysisFilePath }] : [];
    });
  const relations = relationRows
    .filter(relation => relation.filePath === entry.filePath)
    .flatMap((row) => {
      const relation = createSnapshotRelationEntry(row);
      return relation ? [relation] : [];
    });
  const analysis = {
    ...entry.analysis,
    ...(symbols.length > 0 ? { symbols } : {}),
    ...(relations.length > 0 ? { relations } : {}),
  };
  cache.files[entry.filePath] = {
    mtime: entry.mtime,
    size: entry.size,
    ...(entry.contentHash ? { contentHash: entry.contentHash } : {}),
    analysis: projectAnalysisForCacheTiers(
      analysis,
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
      if (containsEmbeddedStructuredAnalysis(rows)) {
        throw new LegacyGraphCacheError();
      }
      const symbolRows = readRowsSync(connection, SYMBOL_ROWS_QUERY) as SymbolRow[];
      const relationRows = readRowsSync(connection, RELATION_ROWS_QUERY) as RelationRow[];
      const cache = createEmptyWorkspaceAnalysisCache();

      for (const row of rows) {
        try {
          addSnapshotEntryToCache(cache, row, symbolRows, relationRows, options);
        } catch (error) {
          console.warn('[CodeGraphy] Skipping unreadable persisted analysis row.', error);
        }
      }

      cache.version = WORKSPACE_ANALYSIS_CACHE_VERSION;
      return cache;
    });
  } catch (error) {
    if (error instanceof LegacyGraphCacheError) {
      clearDatabaseArtifacts(databasePath);
      return createEmptyWorkspaceAnalysisCache();
    }
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
      if (containsEmbeddedStructuredAnalysis(rows)) {
        throw new LegacyGraphCacheError();
      }
      const symbolRows = await readRowsAsync(connection, SYMBOL_ROWS_QUERY) as SymbolRow[];
      const relationRows = await readRowsAsync(connection, RELATION_ROWS_QUERY) as RelationRow[];
      const cache = createEmptyWorkspaceAnalysisCache();

      for (const row of rows) {
        try {
          addSnapshotEntryToCache(cache, row, symbolRows, relationRows, options);
        } catch (error) {
          console.warn('[CodeGraphy] Skipping unreadable persisted analysis row.', error);
        }
      }

      cache.version = WORKSPACE_ANALYSIS_CACHE_VERSION;
      return cache;
    });
  } catch (error) {
    if (error instanceof LegacyGraphCacheError) {
      clearDatabaseArtifacts(databasePath);
      return createEmptyWorkspaceAnalysisCache();
    }
    console.warn('[CodeGraphy] Failed to read persisted analysis database. Rebuilding cache.', error);
    clearDatabaseArtifacts(databasePath);
    return createEmptyWorkspaceAnalysisCache();
  }
}
