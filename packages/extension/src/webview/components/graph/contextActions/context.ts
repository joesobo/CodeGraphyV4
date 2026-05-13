import type { GraphContextMenuNode, GraphContextSelection } from '../contextMenu/contracts';
import type { GraphLayoutMode, GraphLayoutSettings } from '../../../../shared/settings/graphLayout';

export interface GraphContextNodePosition2D {
  x: number;
  y: number;
}

export interface GraphContextNodePosition3D extends GraphContextNodePosition2D {
  z: number;
}

export interface ResolveGraphContextActionOptions {
  graphMode?: GraphLayoutMode;
  graphLayout?: Pick<GraphLayoutSettings, 'ownership' | 'sections'>;
  graphViewportScale?: number | null;
  nodes?: readonly GraphContextMenuNode[];
  nodePositions?: ReadonlyMap<string, GraphContextNodePosition2D | GraphContextNodePosition3D>;
}

export interface GraphContextActionContext {
  selectionKind: GraphContextSelection['kind'];
  targetIds: readonly string[];
  primaryTargetId?: string;
  edgeSourceId?: string;
  edgeTargetId?: string;
  primaryNode?: GraphContextMenuNode;
  graphMode: GraphLayoutMode;
  graphLayout?: Pick<GraphLayoutSettings, 'ownership' | 'sections'>;
  graphPosition?: GraphContextNodePosition2D;
  graphViewportScale?: number | null;
  mutationDirectory: string;
  nodePositions: ReadonlyMap<string, GraphContextNodePosition2D | GraphContextNodePosition3D>;
  ownerSectionId?: string;
}

export function resolveGraphContextActionContext(
  selection: GraphContextSelection,
  options: ResolveGraphContextActionOptions = {},
): GraphContextActionContext {
  const [primaryTargetId, secondaryTargetId] = selection.targets;
  const isEdgeSelection = selection.kind === 'edge';
  const ownerSectionId = resolveContextOwnerSectionId(selection, options.graphLayout);

  return {
    selectionKind: selection.kind,
    targetIds: selection.targets,
    primaryTargetId,
    primaryNode: options.nodes?.find(node => node.id === primaryTargetId),
    edgeSourceId: isEdgeSelection ? primaryTargetId : undefined,
    edgeTargetId: isEdgeSelection ? secondaryTargetId : undefined,
    graphMode: options.graphMode ?? '2d',
    ...(options.graphLayout ? { graphLayout: options.graphLayout } : {}),
    graphPosition: selection.graphPosition,
    graphViewportScale: options.graphViewportScale,
    mutationDirectory: resolveMutationDirectory(primaryTargetId),
    nodePositions: options.nodePositions ?? new Map(),
    ...(ownerSectionId ? { ownerSectionId } : {}),
  };
}

function resolveContextOwnerSectionId(
  selection: GraphContextSelection,
  graphLayout: Pick<GraphLayoutSettings, 'ownership' | 'sections'> | undefined,
): string | undefined {
  if (!graphLayout || selection.kind !== 'node' || selection.targets.length !== 1) {
    return undefined;
  }

  const [targetId] = selection.targets;
  return targetId && graphLayout.sections[targetId] ? targetId : undefined;
}

function resolveMutationDirectory(primaryTargetId: string | undefined): string {
  if (!primaryTargetId || primaryTargetId === '(root)') {
    return '.';
  }

  return primaryTargetId;
}
