import * as fs from 'node:fs';
import * as path from 'node:path';
import { setImmediate as waitForImmediate } from 'node:timers/promises';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import { runStatementAsync, withConnectionAsync } from './connection';
import { ensureDatabaseDirectory, getWorkspaceAnalysisDatabasePath } from './paths';
import {
  cleanupTemporaryDatabase,
  createTemporaryDatabasePath,
  replaceDatabaseCache,
} from './temporary';
import {
  createWorkspaceAnalysisCacheWriterAsync,
  persistAnalysisEntryAsync,
  sortedCacheEntries,
} from '../query/write';
import type { WorkspaceAnalysisDatabaseSaveOptions } from './save';

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
      await runStatementAsync(connection, 'BEGIN TRANSACTION');
      let committed = false;
      try {
        await runStatementAsync(connection, 'DELETE FROM FileAnalysis');
        await runStatementAsync(connection, 'DELETE FROM Symbol');
        await runStatementAsync(connection, 'DELETE FROM Relation');
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
        await runStatementAsync(connection, 'COMMIT');
        committed = true;
      } catch (error) {
        if (!committed) {
          try {
            await runStatementAsync(connection, 'ROLLBACK');
          } catch {
            // Preserve the original save failure.
          }
        }
        throw error;
      }
    });
    replaceDatabaseCache(tempDatabasePath, databasePath);
  } catch (error) {
    cleanupTemporaryDatabase(tempDatabasePath);
    throw error;
  }
}
