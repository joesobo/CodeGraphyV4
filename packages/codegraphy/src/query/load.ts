import * as fs from 'node:fs';
import { readDatabaseSnapshot } from '../database/read';
import { getWorkspaceDatabasePath, resolveWorkspaceRoot } from '../database/paths';
import { upsertRepoRegistryEntry } from '../repoRegistry/file';
import { createMissingDatabaseWarning } from '../repoStatus/read';
import { MissingDatabaseError } from './errors';
import { createQueryContext } from './indexes';
import type { QueryContext } from './model';

export function loadQueryContext(workspaceRoot: string): QueryContext {
  const resolvedWorkspaceRoot = resolveWorkspaceRoot(workspaceRoot);
  const databasePath = getWorkspaceDatabasePath(resolvedWorkspaceRoot);
  if (!fs.existsSync(databasePath)) {
    throw new MissingDatabaseError(
      resolvedWorkspaceRoot,
      databasePath,
      createMissingDatabaseWarning(resolvedWorkspaceRoot),
    );
  }

  upsertRepoRegistryEntry({
    workspaceRoot: resolvedWorkspaceRoot,
    databasePath,
    lastSeenAt: new Date().toISOString(),
  });

  const snapshot = readDatabaseSnapshot(databasePath);
  return createQueryContext(resolvedWorkspaceRoot, snapshot);
}
