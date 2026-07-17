import * as fs from 'node:fs';
import * as path from 'node:path';
import { setImmediate as waitForImmediate } from 'node:timers/promises';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import {
  recreateInvalidDatabase,
  runStatementAsync,
  withConnectionAsync,
} from './connection';
import { ensureDatabaseDirectory, getWorkspaceAnalysisDatabasePath } from './paths';
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
  let reportedProgress = 0;
  options.onProgress?.({ current: 0, total });

  const persist = (): Promise<void> => withConnectionAsync(
    databasePath,
    async (connection) => {
      await runStatementAsync(connection, 'BEGIN TRANSACTION');
      let committed = false;
      try {
        await runStatementAsync(connection, 'DELETE FROM File');
        await runStatementAsync(connection, 'DELETE FROM Symbol');
        await runStatementAsync(connection, 'DELETE FROM Node');
        await runStatementAsync(connection, 'DELETE FROM NodeType');
        await runStatementAsync(connection, 'DELETE FROM EdgeType');
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
          if (current > reportedProgress) {
            reportedProgress = current;
            options.onProgress?.({ current, total });
          }
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
    },
  );

  try {
    await persist();
  } catch (error) {
    if (!recreateInvalidDatabase(databasePath, error)) {
      throw error;
    }
    await persist();
  }
}
