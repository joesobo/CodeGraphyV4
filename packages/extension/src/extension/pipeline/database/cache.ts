import * as fs from 'node:fs';
import * as path from 'node:path';
import * as lb from '@ladybugdb/core';
import {
  createEmptyWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
  type IWorkspaceAnalysisCache,
} from '../cache';
import type { IFileAnalysisResult } from '../../../core/plugins/types/contracts';

const DATABASE_DIRECTORY_NAME = '.codegraphy';
const DATABASE_FILE_NAME = 'graph.lbug';

interface FileAnalysisRow {
  filePath?: unknown;
  mtime?: unknown;
  size?: unknown;
  analysis?: unknown;
}

function ensureDatabaseDirectory(workspaceRoot: string): void {
  fs.mkdirSync(workspaceRoot, { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, DATABASE_DIRECTORY_NAME), { recursive: true });
}

function ensureSchema(connection: lb.Connection): void {
  connection.querySync(
    'CREATE NODE TABLE IF NOT EXISTS FileAnalysis(filePath STRING PRIMARY KEY, mtime INT64, size INT64, analysis STRING)',
  );
}

function escapeCypherString(value: string): string {
  return JSON.stringify(value);
}

function clearDatabaseArtifacts(databasePath: string): void {
  for (const filePath of [databasePath, `${databasePath}.wal`]) {
    try {
      fs.rmSync(filePath, { force: true });
    } catch {
      // Best effort only.
    }
  }
}

function withConnection<T>(
  databasePath: string,
  callback: (connection: lb.Connection) => T,
): T {
  const database = new lb.Database(databasePath);
  const connection = new lb.Connection(database);

  try {
    connection.initSync();
    ensureSchema(connection);
    return callback(connection);
  } finally {
    connection.closeSync();
  }
}

export function getWorkspaceAnalysisDatabasePath(workspaceRoot: string): string {
  return path.join(workspaceRoot, DATABASE_DIRECTORY_NAME, DATABASE_FILE_NAME);
}

export function loadWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
): IWorkspaceAnalysisCache {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return createEmptyWorkspaceAnalysisCache();
  }

  try {
    return withConnection(databasePath, (connection) => {
      const result = connection.querySync(
        'MATCH (entry:FileAnalysis) RETURN entry.filePath AS filePath, entry.mtime AS mtime, entry.size AS size, entry.analysis AS analysis ORDER BY entry.filePath',
      );
      const queryResult = (
        Array.isArray(result) ? result[0] : result
      ) as unknown as { getAllSync(): FileAnalysisRow[] } | undefined;
      const rows = queryResult?.getAllSync() ?? [];
      const cache = createEmptyWorkspaceAnalysisCache();

      for (const row of rows) {
        try {
          const filePath = typeof row.filePath === 'string' ? row.filePath : undefined;
          const analysisText = typeof row.analysis === 'string' ? row.analysis : undefined;
          const size =
            typeof row.size === 'number' || typeof row.size === 'bigint'
              ? Number(row.size)
              : undefined;

          if (!filePath || !analysisText) {
            continue;
          }

          cache.files[filePath] = {
            mtime: Number(row.mtime ?? 0),
            size,
            analysis: JSON.parse(analysisText) as IFileAnalysisResult,
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

export function saveWorkspaceAnalysisDatabaseCache(
  workspaceRoot: string,
  cache: IWorkspaceAnalysisCache,
): void {
  ensureDatabaseDirectory(workspaceRoot);
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);

  withConnection(databasePath, (connection) => {
    connection.querySync('MATCH (entry:FileAnalysis) DELETE entry');

    for (const [filePath, entry] of Object.entries(cache.files).sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const size = entry.size ?? 0;
      connection.querySync(
        `CREATE (entry:FileAnalysis {filePath: ${escapeCypherString(filePath)}, mtime: ${entry.mtime}, size: ${size}, analysis: ${escapeCypherString(JSON.stringify(entry.analysis))}})`,
      );
    }
  });
}

export function clearWorkspaceAnalysisDatabaseCache(workspaceRoot: string): void {
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(databasePath)) {
    return;
  }

  withConnection(databasePath, (connection) => {
    connection.querySync('MATCH (entry:FileAnalysis) DELETE entry');
  });
}
