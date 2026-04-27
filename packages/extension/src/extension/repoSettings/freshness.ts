import type { ICodeGraphyRepoMeta } from './meta';

export type CodeGraphyIndexFreshness = 'fresh' | 'stale' | 'missing';
export type CodeGraphyIndexStaleReason =
  | 'never-indexed'
  | 'plugin-signature-changed'
  | 'settings-signature-changed'
  | 'missing-indexed-commit'
  | 'commit-changed'
  | 'current-commit-unavailable'
  | 'pending-changed-files';

export interface CodeGraphyIndexStatus {
  freshness: CodeGraphyIndexFreshness;
  hasIndex: boolean;
  staleReasons: CodeGraphyIndexStaleReason[];
  detail: string;
}

function createFreshDetail(): string {
  return 'CodeGraphy index is fresh.';
}

function createMissingDetail(): string {
  return 'CodeGraphy index is missing. Index the repo to build the graph.';
}

function createStaleDetail(
  reasons: readonly CodeGraphyIndexStaleReason[],
  pendingChangedFiles: readonly string[],
): string {
  if (reasons.includes('pending-changed-files')) {
    const suffix = pendingChangedFiles.length === 1 ? '1 pending changed file.' : `${pendingChangedFiles.length} pending changed files.`;
    return `CodeGraphy index is stale: ${suffix}`;
  }

  if (reasons.includes('commit-changed')) {
    return 'CodeGraphy index is stale: the workspace commit changed since the last index.';
  }

  if (reasons.includes('plugin-signature-changed')) {
    return 'CodeGraphy index is stale: installed CodeGraphy plugins changed.';
  }

  if (reasons.includes('settings-signature-changed')) {
    return 'CodeGraphy index is stale: CodeGraphy settings changed.';
  }

  if (reasons.includes('missing-indexed-commit')) {
    return 'CodeGraphy index is stale: the repo now has a commit, but the saved index does not.';
  }

  if (reasons.includes('current-commit-unavailable')) {
    return 'CodeGraphy index is stale: the current workspace commit could not be resolved.';
  }

  return 'CodeGraphy index is stale. Reindex the repo to refresh it.';
}

export function evaluateCodeGraphyIndexStatus(input: {
  meta: ICodeGraphyRepoMeta;
  currentCommit: string | null;
  pluginSignature: string | null;
  settingsSignature: string;
}): CodeGraphyIndexStatus {
  const { meta, currentCommit, pluginSignature, settingsSignature } = input;

  if (meta.lastIndexedAt === null) {
    return {
      freshness: 'missing',
      hasIndex: false,
      staleReasons: ['never-indexed'],
      detail: createMissingDetail(),
    };
  }

  const staleReasons: CodeGraphyIndexStaleReason[] = [];
  if (meta.pendingChangedFiles.length > 0) {
    staleReasons.push('pending-changed-files');
  }
  if (meta.pluginSignature !== pluginSignature) {
    staleReasons.push('plugin-signature-changed');
  }
  if (meta.settingsSignature !== settingsSignature) {
    staleReasons.push('settings-signature-changed');
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
      hasIndex: true,
      staleReasons: [],
      detail: createFreshDetail(),
    };
  }

  return {
    freshness: 'stale',
    hasIndex: false,
    staleReasons,
    detail: createStaleDetail(staleReasons, meta.pendingChangedFiles),
  };
}
