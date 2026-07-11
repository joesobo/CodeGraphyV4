import { runStatementAsync, withConnectionAsync } from './connection';
import { ensureDatabaseDirectory, getWorkspaceAnalysisDatabasePath } from './paths';
import {
  createWorkspaceAnalysisCachePatchWriterAsync,
  deleteAnalysisEntryAsync,
  persistAnalysisEntryAsync,
  sortedCacheEntries,
} from '../query/write';
import type { WorkspaceAnalysisDatabasePatch } from './save';

async function runPatchTransaction(
  connection: Parameters<typeof runStatementAsync>[0],
  write: () => Promise<void>,
): Promise<void> {
  await runStatementAsync(connection, 'BEGIN TRANSACTION');
  let committed = false;
  try {
    await write();
    await runStatementAsync(connection, 'COMMIT');
    committed = true;
  } catch (error) {
    if (!committed) {
      try {
        await runStatementAsync(connection, 'ROLLBACK');
      } catch {
        // Keep the original patch failure as the actionable error.
      }
    }
    throw error;
  }
}

export async function patchWorkspaceAnalysisDatabaseCacheAsync(
  workspaceRoot: string,
  patch: WorkspaceAnalysisDatabasePatch,
): Promise<void> {
  ensureDatabaseDirectory(workspaceRoot);
  const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
  const deleteFilePaths = new Set([
    ...(patch.deleteFilePaths ?? []),
    ...Object.keys(patch.upsertFiles ?? {}),
  ]);

  await withConnectionAsync(databasePath, async (connection) => {
    await runPatchTransaction(connection, async () => {
      const writer = await createWorkspaceAnalysisCachePatchWriterAsync(connection);
      for (const filePath of [...deleteFilePaths].sort()) {
        await deleteAnalysisEntryAsync(writer, filePath);
      }
      for (const [filePath, entry] of sortedCacheEntries({
        version: '',
        files: patch.upsertFiles ?? {},
      })) {
        await persistAnalysisEntryAsync(writer, filePath, entry, async () => undefined);
      }
    });
  });
}
