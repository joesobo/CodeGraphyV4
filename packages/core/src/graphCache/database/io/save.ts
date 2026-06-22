import * as fs from 'node:fs';
import * as path from 'node:path';
import { setImmediate as waitForImmediate } from 'node:timers/promises';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import { runStatementAsync, runStatementSync, withConnection, withConnectionAsync } from './connection';
import { ensureDatabaseDirectory, getWorkspaceAnalysisDatabasePath } from './paths';
import {
  createWorkspaceAnalysisCacheWriter,
  createWorkspaceAnalysisCacheWriterAsync,
  persistAnalysisEntry,
  persistAnalysisEntryAsync,
  sortedCacheEntries,
} from '../query/write';

export interface WorkspaceAnalysisDatabaseSaveProgress {
  current: number;
  total: number;
}

export interface WorkspaceAnalysisDatabaseSaveOptions {
  onProgress?: (progress: WorkspaceAnalysisDatabaseSaveProgress) => void;
  yieldEvery?: number;
}

function createTemporaryDatabasePath(databasePath: string): string {
  return `${databasePath}.${process.pid}.${Date.now()}.tmp`;
}

function replaceDatabaseCache(tempDatabasePath: string, databasePath: string): void {
  fs.renameSync(tempDatabasePath, databasePath);
}

function cleanupTemporaryDatabase(tempDatabasePath: string): void {
  if (fs.existsSync(tempDatabasePath)) {
    fs.rmSync(tempDatabasePath, { force: true });
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

export async function saveWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
  cache: IWorkspaceAnalysisCache,
  options: WorkspaceAnalysisDatabaseSaveOptions = {},
): Promise<void> {
  ensureDatabaseDirectory(workspaceRoot);
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  if (!fs.existsSync(path.dirname(databasePath))) {
    return;
  }

  const entries = sortedCacheEntries(cache);
  const total = entries.length;
  const yieldEvery = options.yieldEvery ?? 100;
  const tempDatabasePath = createTemporaryDatabasePath(databasePath);
  options.onProgress?.({ current: 0, total });

  try {
    await withConnectionAsync(tempDatabasePath, async (connection) => {
      await runStatementAsync(connection, 'MATCH (entry:FileAnalysis) DELETE entry');
      await runStatementAsync(connection, 'MATCH (entry:Symbol) DELETE entry');
      await runStatementAsync(connection, 'MATCH (entry:Relation) DELETE entry');
      const writer = await createWorkspaceAnalysisCacheWriterAsync(connection);

      let current = 0;
      let statementsSinceYield = 0;
      const yieldAfterStatement = async (): Promise<void> => {
        statementsSinceYield += 1;
        if (yieldEvery > 0 && statementsSinceYield >= yieldEvery) {
          statementsSinceYield = 0;
          await waitForImmediate();
        }
      };

      for (const [filePath, entry] of entries) {
        await persistAnalysisEntryAsync(writer, filePath, entry, yieldAfterStatement);
        current += 1;
        options.onProgress?.({ current, total });
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
