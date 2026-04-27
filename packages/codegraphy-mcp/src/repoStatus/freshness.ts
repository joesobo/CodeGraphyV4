interface RepoMeta {
  version: 1;
  lastIndexedAt: string | null;
  lastIndexedCommit: string | null;
  pluginSignature: string | null;
  settingsSignature: string | null;
  pendingChangedFiles: string[];
}

export type RepoFreshness = 'fresh' | 'stale' | 'missing';
export type RepoStaleReason =
  | 'never-indexed'
  | 'missing-indexed-commit'
  | 'commit-changed'
  | 'current-commit-unavailable'
  | 'pending-changed-files';

export interface RepoFreshnessResult {
  freshness: RepoFreshness;
  staleReasons: RepoStaleReason[];
  detail: string;
}

function createFreshDetail(): string {
  return 'CodeGraphy index is fresh.';
}

function createMissingDetail(): string {
  return 'CodeGraphy index metadata is missing. Reindex the repo in VS Code.';
}

function createStaleDetail(reasons: readonly RepoStaleReason[], pendingChangedFiles: readonly string[]): string {
  if (reasons.includes('pending-changed-files')) {
    const suffix = pendingChangedFiles.length === 1 ? '1 pending changed file.' : `${pendingChangedFiles.length} pending changed files.`;
    return `CodeGraphy index is stale: ${suffix}`;
  }

  if (reasons.includes('commit-changed')) {
    return 'CodeGraphy index is stale: the workspace commit changed since the last index.';
  }

  if (reasons.includes('missing-indexed-commit')) {
    return 'CodeGraphy index is stale: the repo now has a commit, but the saved index does not.';
  }

  if (reasons.includes('current-commit-unavailable')) {
    return 'CodeGraphy index is stale: the current workspace commit could not be resolved.';
  }

  return 'CodeGraphy index is stale. Reindex the repo in VS Code.';
}

export function evaluateRepoFreshness(input: {
  meta: RepoMeta;
  currentCommit: string | null;
}): RepoFreshnessResult {
  const { meta, currentCommit } = input;

  if (meta.lastIndexedAt === null) {
    return {
      freshness: 'missing',
      staleReasons: ['never-indexed'],
      detail: createMissingDetail(),
    };
  }

  const staleReasons: RepoStaleReason[] = [];
  if (meta.pendingChangedFiles.length > 0) {
    staleReasons.push('pending-changed-files');
  }

  if (currentCommit === null) {
    if (meta.lastIndexedCommit !== null) {
      staleReasons.push('current-commit-unavailable');
    }
  } else if (meta.lastIndexedCommit === null) {
    staleReasons.push('missing-indexed-commit');
  } else if (meta.lastIndexedCommit !== currentCommit) {
    staleReasons.push('commit-changed');
  }

  if (staleReasons.length === 0) {
    return {
      freshness: 'fresh',
      staleReasons: [],
      detail: createFreshDetail(),
    };
  }

  return {
    freshness: 'stale',
    staleReasons,
    detail: createStaleDetail(staleReasons, meta.pendingChangedFiles),
  };
}
