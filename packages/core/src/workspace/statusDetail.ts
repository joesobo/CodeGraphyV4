import type { CodeGraphyWorkspaceStaleReason, CodeGraphyWorkspaceStatusState } from './statusContracts';

export function createCodeGraphyWorkspaceStatusDetail(
  state: CodeGraphyWorkspaceStatusState,
  reasons: readonly CodeGraphyWorkspaceStaleReason[],
): string {
  if (state === 'fresh') {
    return 'CodeGraphy Workspace Graph Cache is fresh.';
  }

  if (reasons.includes('never-indexed')) {
    return 'CodeGraphy Workspace Graph Cache is missing. Run Indexing to build it.';
  }

  if (reasons.includes('graph-cache-missing')) {
    return 'CodeGraphy Workspace Graph Cache file is missing. Run Indexing to rebuild it.';
  }

  if (reasons.includes('pending-changed-files')) {
    return 'CodeGraphy Workspace Graph Cache is stale: files changed since the last Indexing run.';
  }

  if (reasons.includes('plugin-signature-changed')) {
    return 'CodeGraphy Workspace Graph Cache is stale: enabled plugins changed.';
  }

  if (reasons.includes('settings-signature-changed')) {
    return 'CodeGraphy Workspace Graph Cache is stale: Workspace Settings changed.';
  }

  if (reasons.includes('analysis-version-changed')) {
    return 'CodeGraphy Workspace Graph Cache is stale: the analysis schema changed.';
  }

  return 'CodeGraphy Workspace Graph Cache is stale. Run Indexing to refresh it.';
}
