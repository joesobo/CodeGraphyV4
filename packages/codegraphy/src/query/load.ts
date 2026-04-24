import * as fs from 'node:fs';
import { readDatabaseSnapshot } from '../database/read';
import { getWorkspaceDatabasePath, resolveWorkspaceRoot, toRepoRelativeFilePath } from '../database/paths';
import { upsertRepoRegistryEntry } from '../repoRegistry/file';
import { createMissingDatabaseWarning } from '../repoStatus/read';
import { MissingDatabaseError } from './errors';
import { createQueryContext } from './indexes';
import type { QueryContext } from './model';
import type { DatabaseSnapshot } from '../database/model';

function normalizeSnapshotPaths(workspaceRoot: string, snapshot: DatabaseSnapshot): DatabaseSnapshot {
  return {
    files: snapshot.files.map((file) => ({
      ...file,
      filePath: toRepoRelativeFilePath(file.filePath, workspaceRoot),
    })),
    symbols: snapshot.symbols.map((symbol) => ({
      ...symbol,
      filePath: toRepoRelativeFilePath(symbol.filePath, workspaceRoot),
    })),
    relations: snapshot.relations.map((relation) => ({
      ...relation,
      fromFilePath: toRepoRelativeFilePath(relation.fromFilePath, workspaceRoot),
      toFilePath: relation.toFilePath
        ? toRepoRelativeFilePath(relation.toFilePath, workspaceRoot)
        : relation.toFilePath,
      resolvedPath: relation.resolvedPath
        ? toRepoRelativeFilePath(relation.resolvedPath, workspaceRoot)
        : relation.resolvedPath,
    })),
  };
}

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

  const snapshot = normalizeSnapshotPaths(resolvedWorkspaceRoot, readDatabaseSnapshot(databasePath));
  return createQueryContext(resolvedWorkspaceRoot, snapshot);
}
