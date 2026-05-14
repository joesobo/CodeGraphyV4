import type { GraphLayoutMode } from '../../../../../../shared/settings/graphLayout';
import type {
  GraphContextNodePosition2D,
  GraphContextNodePosition3D,
} from '../../../contextActions/context';
import type { FGNode } from '../../../model/build';

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function readNodePosition(
  node: FGNode,
  graphMode: GraphLayoutMode,
): GraphContextNodePosition2D | GraphContextNodePosition3D | undefined {
  if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
    return undefined;
  }

  if (graphMode === '3d') {
    return isFiniteNumber(node.z)
      ? { x: node.x, y: node.y, z: node.z }
      : undefined;
  }

  return { x: node.x, y: node.y };
}

export function createGraphNodePositionMap(
  nodes: readonly FGNode[],
  graphMode: GraphLayoutMode,
): Map<string, GraphContextNodePosition2D | GraphContextNodePosition3D> {
  const positions = new Map<string, GraphContextNodePosition2D | GraphContextNodePosition3D>();

  for (const node of nodes) {
    const position = readNodePosition(node, graphMode);
    if (position) {
      positions.set(node.id, position);
    }
  }

  return positions;
}
