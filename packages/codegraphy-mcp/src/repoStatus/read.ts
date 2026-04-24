import * as fs from 'node:fs';
import { getWorkspaceDatabasePath, resolveWorkspaceRoot } from '../database/paths';
import { readRepoRegistry, upsertRepoRegistryEntry } from '../repoRegistry/file';
import type { RepoStatusResult } from './model';

export const CODEGRAPHY_EXTENSION_URL =
  'https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy';

export function createMissingDatabaseWarning(workspaceRoot: string): string {
  return `No CodeGraphy database found for ${workspaceRoot}. Open the repo in VS Code with the CodeGraphy extension installed, index the repo, then retry. ${CODEGRAPHY_EXTENSION_URL}`;
}

export function readRepoStatus(workspaceRoot: string): RepoStatusResult {
  const resolvedWorkspaceRoot = resolveWorkspaceRoot(workspaceRoot);
  const databasePath = getWorkspaceDatabasePath(resolvedWorkspaceRoot);
  const databaseExists = fs.existsSync(databasePath);
  const registry = readRepoRegistry();
  const existing = registry.repos.find((repo) => repo.workspaceRoot === resolvedWorkspaceRoot);

  if (databaseExists) {
    upsertRepoRegistryEntry({
      workspaceRoot: resolvedWorkspaceRoot,
      databasePath,
      lastSeenAt: new Date().toISOString(),
    });

    return {
      workspaceRoot: resolvedWorkspaceRoot,
      databasePath,
      registered: true,
      status: 'indexed',
    };
  }

  return {
    workspaceRoot: resolvedWorkspaceRoot,
    databasePath,
    registered: Boolean(existing),
    status: existing ? 'stale' : 'missing',
    warning: createMissingDatabaseWarning(resolvedWorkspaceRoot),
  };
}

export function listRegisteredRepoStatuses(): RepoStatusResult[] {
  const registry = readRepoRegistry();
  return registry.repos.map((repo) => readRepoStatus(repo.workspaceRoot));
}
