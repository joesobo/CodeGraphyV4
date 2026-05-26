import type { CodeGraphyWorkspaceStaleReason, CodeGraphyWorkspaceStatusState } from './statusContracts';

export function createCodeGraphyWorkspaceStatusState(input: {
  hasGraphCache: boolean;
  staleReasons: readonly CodeGraphyWorkspaceStaleReason[];
}): CodeGraphyWorkspaceStatusState {
  if (input.staleReasons.length === 0) {
    return 'fresh';
  }

  return input.hasGraphCache
    && !input.staleReasons.includes('never-indexed')
    && !input.staleReasons.includes('graph-cache-missing')
    ? 'stale'
    : 'missing';
}
