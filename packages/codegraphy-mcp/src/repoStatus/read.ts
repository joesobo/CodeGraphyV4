import * as fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { getWorkspaceDatabasePath, resolveWorkspaceRoot } from '../database/paths';
import { readRepoRegistry, upsertRepoRegistryEntry } from '../repoRegistry/file';
import type { RepoStatusResult } from './model';
import { evaluateRepoFreshness } from './freshness';

export const CODEGRAPHY_EXTENSION_URL =
  'https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy';

interface CodeGraphyRepoMeta {
  version: 1;
  lastIndexedAt: string | null;
  lastIndexedCommit: string | null;
  pluginSignature: string | null;
  settingsSignature: string | null;
  pendingChangedFiles: string[];
}

interface ReadRepoStatusDependencies {
  readCurrentCommitSha(workspaceRoot: string): string | null;
}

const DEFAULT_META: CodeGraphyRepoMeta = {
  version: 1,
  lastIndexedAt: null,
  lastIndexedCommit: null,
  pluginSignature: null,
  settingsSignature: null,
  pendingChangedFiles: [],
};

export function createMissingDatabaseWarning(workspaceRoot: string): string {
  return `No CodeGraphy database found for ${workspaceRoot}. Open the repo in VS Code with the CodeGraphy extension installed, index the repo, then retry. ${CODEGRAPHY_EXTENSION_URL}`;
}

function readRepoMeta(workspaceRoot: string): CodeGraphyRepoMeta {
  try {
    const metaPath = `${resolveWorkspaceRoot(workspaceRoot)}/.codegraphy/meta.json`;
    const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as Partial<CodeGraphyRepoMeta>;
    return {
      ...DEFAULT_META,
      ...parsed,
    };
  } catch {
    return DEFAULT_META;
  }
}

function readCurrentCommitSha(workspaceRoot: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

const DEFAULT_DEPENDENCIES: ReadRepoStatusDependencies = {
  readCurrentCommitSha,
};

export function readRepoStatus(
  workspaceRoot: string,
  dependencies: ReadRepoStatusDependencies = DEFAULT_DEPENDENCIES,
): RepoStatusResult {
  const resolvedWorkspaceRoot = resolveWorkspaceRoot(workspaceRoot);
  const databasePath = getWorkspaceDatabasePath(resolvedWorkspaceRoot);
  const databaseExists = fs.existsSync(databasePath);
  const registry = readRepoRegistry();
  const existing = registry.repos.find((repo) => repo.workspaceRoot === resolvedWorkspaceRoot);
  const meta = readRepoMeta(resolvedWorkspaceRoot);
  const currentCommit = dependencies.readCurrentCommitSha(resolvedWorkspaceRoot);
  const freshness = evaluateRepoFreshness({
    meta,
    currentCommit,
  });

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
      status: freshness.freshness === 'fresh' ? 'indexed' : 'stale',
      freshness: freshness.freshness,
      detail: freshness.detail,
      lastIndexedAt: meta.lastIndexedAt,
      lastIndexedCommit: meta.lastIndexedCommit,
      currentCommit,
      pendingChangedFiles: meta.pendingChangedFiles,
      staleReasons: freshness.staleReasons,
      warning: freshness.freshness === 'stale'
        ? `${freshness.detail} Reindex the repo in VS Code to refresh it.`
        : undefined,
    };
  }

  return {
    workspaceRoot: resolvedWorkspaceRoot,
    databasePath,
    registered: Boolean(existing),
    status: 'missing',
    freshness: 'missing',
    detail: createMissingDatabaseWarning(resolvedWorkspaceRoot),
    lastIndexedAt: meta.lastIndexedAt,
    lastIndexedCommit: meta.lastIndexedCommit,
    currentCommit,
    pendingChangedFiles: meta.pendingChangedFiles,
    staleReasons: ['never-indexed'],
    warning: createMissingDatabaseWarning(resolvedWorkspaceRoot),
  };
}

export function listRegisteredRepoStatuses(): RepoStatusResult[] {
  const registry = readRepoRegistry();
  return registry.repos.map((repo) => readRepoStatus(repo.workspaceRoot));
}
