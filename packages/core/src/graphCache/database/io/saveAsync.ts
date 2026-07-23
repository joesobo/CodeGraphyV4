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
  persistWorkspaceCacheAsync,
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

  const total = Object.keys(cache.files).length;
  const yieldEvery = options.yieldEvery ?? 100;
  let reportedProgress = 0;
  options.onProgress?.({ current: 0, total });

  const persist = (): Promise<void> => withConnectionAsync(
    databasePath,
    async (connection) => {
      await runStatementAsync(connection, 'BEGIN TRANSACTION');
      let committed = false;
      try {
        await runStatementAsync(connection, 'DELETE FROM Edge');
        await runStatementAsync(connection, 'DELETE FROM Symbol');
        await runStatementAsync(connection, 'DELETE FROM Node');
        await runStatementAsync(connection, 'DELETE FROM File');
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
        const reportPersistedFile = async (): Promise<void> => {
          current += 1;
          if (current < total && current > reportedProgress) {
            reportedProgress = current;
            options.onProgress?.({ current, total });
          }
        };

        const callbacks = {
          afterFile: reportPersistedFile,
          afterStatement: yieldAfterStatement,
        };
        if (options.nodeTypes) {
          await persistWorkspaceCacheAsync(
            writer,
            cache,
            options.graph,
            callbacks,
            options.nodeTypes,
          );
        } else {
          await persistWorkspaceCacheAsync(writer, cache, options.graph, callbacks);
        }
        await runStatementAsync(connection, 'COMMIT');
        committed = true;
        if (total > reportedProgress) {
          reportedProgress = total;
          options.onProgress?.({ current: total, total });
        }
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
