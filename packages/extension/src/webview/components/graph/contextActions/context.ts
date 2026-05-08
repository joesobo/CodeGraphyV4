import type { GraphContextSelection } from '../contextMenu/contracts';
import type { GraphLayoutMode } from '../../../../shared/settings/graphLayout';

export interface GraphContextNodePosition2D {
  x: number;
  y: number;
}

export interface GraphContextNodePosition3D extends GraphContextNodePosition2D {
  z: number;
}

export interface ResolveGraphContextActionOptions {
  graphMode?: GraphLayoutMode;
  graphViewportScale?: number | null;
  nodePositions?: ReadonlyMap<string, GraphContextNodePosition2D | GraphContextNodePosition3D>;
}

export interface GraphContextActionContext {
  selectionKind: GraphContextSelection['kind'];
  targetIds: readonly string[];
  primaryTargetId?: string;
  edgeSourceId?: string;
  edgeTargetId?: string;
  graphMode: GraphLayoutMode;
  graphPosition?: GraphContextNodePosition2D;
  graphViewportScale?: number | null;
  mutationDirectory: string;
  nodePositions: ReadonlyMap<string, GraphContextNodePosition2D | GraphContextNodePosition3D>;
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
    edgeSourceId: isEdgeSelection ? primaryTargetId : undefined,
    edgeTargetId: isEdgeSelection ? secondaryTargetId : undefined,
    graphMode: options.graphMode ?? '2d',
    graphPosition: selection.graphPosition,
    graphViewportScale: options.graphViewportScale,
    mutationDirectory: resolveMutationDirectory(primaryTargetId),
    nodePositions: options.nodePositions ?? new Map(),
  };
}

function resolveMutationDirectory(primaryTargetId: string | undefined): string {
  if (!primaryTargetId || primaryTargetId === '(root)') {
    return '.';
  }

  return primaryTargetId;
}
