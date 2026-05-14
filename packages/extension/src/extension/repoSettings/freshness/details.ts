import type { CodeGraphyIndexStaleReason } from './model';

type StaleDetailFactory = (pendingChangedFiles: readonly string[]) => string;

const STALE_DETAIL_FACTORIES: ReadonlyArray<{
  reason: CodeGraphyIndexStaleReason;
  createDetail: StaleDetailFactory;
}> = [
  {
    reason: 'pending-changed-files',
    createDetail: createPendingChangedFilesDetail,
  },
  {
    reason: 'commit-changed',
    createDetail: () => 'CodeGraphy index is stale: the workspace commit changed since the last index.',
  },
  {
    reason: 'plugin-signature-changed',
    createDetail: () => 'CodeGraphy index is stale: installed CodeGraphy plugins changed.',
  },
  {
    reason: 'settings-signature-changed',
    createDetail: () => 'CodeGraphy index is stale: CodeGraphy settings changed.',
  },
  {
    reason: 'missing-indexed-commit',
    createDetail: () => 'CodeGraphy index is stale: the workspace now has a commit, but the saved index does not.',
  },
  {
    reason: 'current-commit-unavailable',
    createDetail: () => 'CodeGraphy index is stale: the current workspace commit could not be resolved.',
  },
];

export function createFreshDetail(): string {
  return 'CodeGraphy index is fresh.';
}

export function createMissingDetail(): string {
  return 'CodeGraphy index is missing. Index the workspace to build the graph.';
}

function createPendingChangedFilesDetail(pendingChangedFiles: readonly string[]): string {
  const suffix = pendingChangedFiles.length === 1 ? '1 pending changed file.' : `${pendingChangedFiles.length} pending changed files.`;
  return `CodeGraphy index is stale: ${suffix}`;
}

export function createStaleDetail(
  reasons: readonly CodeGraphyIndexStaleReason[],
  pendingChangedFiles: readonly string[],
): string {
  for (const factory of STALE_DETAIL_FACTORIES) {
    if (reasons.includes(factory.reason)) {
      return factory.createDetail(pendingChangedFiles);
    }
  }

  return 'CodeGraphy index is stale. Reindex the workspace to refresh it.';
}
