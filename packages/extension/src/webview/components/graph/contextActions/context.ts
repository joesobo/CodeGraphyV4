import type { GraphContextMenuNode, GraphContextSelection } from '../contextMenu/contracts';

export interface ResolveGraphContextActionOptions {
  graphViewportScale?: number | null;
  nodes?: readonly GraphContextMenuNode[];
}

export interface GraphContextActionContext {
  selectionKind: GraphContextSelection['kind'];
  targetIds: readonly string[];
  primaryTargetId?: string;
  edgeId?: string;
  edgeSourceId?: string;
  edgeTargetId?: string;
  primaryNode?: GraphContextMenuNode;
  graphPosition?: { x: number; y: number };
  graphViewportScale?: number | null;
  mutationDirectory: string;
  comparisonPath?: string;
}

export function resolveGraphContextActionContext(
  selection: GraphContextSelection,
  options: ResolveGraphContextActionOptions = {},
): GraphContextActionContext {
  const [primaryTargetId, secondaryTargetId] = selection.targets;
  const isEdgeSelection = selection.kind === 'edge';

  return {
    selectionKind: selection.kind,
    targetIds: selection.targets,
    primaryTargetId,
    edgeId: selection.edgeId,
    primaryNode: options.nodes?.find(node => node.id === primaryTargetId),
    edgeSourceId: isEdgeSelection ? primaryTargetId : undefined,
    edgeTargetId: isEdgeSelection ? secondaryTargetId : undefined,
    graphPosition: selection.graphPosition,
    graphViewportScale: options.graphViewportScale,
    mutationDirectory: resolveMutationDirectory(primaryTargetId),
  };
}

function resolveMutationDirectory(primaryTargetId: string | undefined): string {
  if (!primaryTargetId || primaryTargetId === '(root)') {
    return '.';
  }

  return primaryTargetId;
}
