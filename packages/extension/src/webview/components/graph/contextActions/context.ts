import type { GraphContextSelection } from '../contextMenu/contracts';

export interface GraphContextActionContext {
  selectionKind: GraphContextSelection['kind'];
  targetIds: readonly string[];
  primaryTargetId?: string;
  edgeSourceId?: string;
  edgeTargetId?: string;
  mutationDirectory: string;
}

export function resolveGraphContextActionContext(
  selection: GraphContextSelection
): GraphContextActionContext {
  const [primaryTargetId, secondaryTargetId] = selection.targets;
  const isEdgeSelection = selection.kind === 'edge';

  return {
    selectionKind: selection.kind,
    targetIds: selection.targets,
    primaryTargetId,
    edgeSourceId: isEdgeSelection ? primaryTargetId : undefined,
    edgeTargetId: isEdgeSelection ? secondaryTargetId : undefined,
    mutationDirectory: resolveMutationDirectory(primaryTargetId),
  };
}

function resolveMutationDirectory(primaryTargetId: string | undefined): string {
  if (!primaryTargetId || primaryTargetId === '(root)') {
    return '.';
  }

  return primaryTargetId;
}
