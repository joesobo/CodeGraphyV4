import * as fs from 'node:fs';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';
import { setImmediate as waitForImmediate } from 'node:timers/promises';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import { captureActivePerfMetricEmitter } from '../../../diagnostics/perfMetrics';
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

function getPersistedCacheBytes(databasePath: string): number {
  const databaseBytes = fs.statSync(databasePath).size;
  const walPath = `${databasePath}.wal`;
  const walBytes = fs.existsSync(walPath) ? fs.statSync(walPath).size : 0;
  return databaseBytes + walBytes;
}

export async function saveWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
  cache: IWorkspaceAnalysisCache,
  options: WorkspaceAnalysisDatabaseSaveOptions = {},
): Promise<void> {
  const emitPerfMetric = captureActivePerfMetricEmitter();
  const startedAt = emitPerfMetric ? performance.now() : undefined;
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
    if (emitPerfMetric && startedAt !== undefined) {
      const durationMs = performance.now() - startedAt;
      const cacheBytes = getPersistedCacheBytes(databasePath);
      emitPerfMetric({ metric: 'cacheSaveMs', value: durationMs, unit: 'ms' });
      emitPerfMetric({ metric: 'cacheBytes', value: cacheBytes, unit: 'bytes' });
    }
  } catch (error) {
    cleanupTemporaryDatabase(tempDatabasePath);
    throw error;
  }
}
