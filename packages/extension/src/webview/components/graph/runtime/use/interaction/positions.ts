import type { FGNode } from '../../../model/build';
import { isFiniteNumber } from '../../physics/numeric';

type GraphMode = '2d' | '3d';

export interface GraphNodePosition2D {
  x: number;
  y: number;
}

export interface GraphNodePosition3D extends GraphNodePosition2D {
  z: number;
}

export function readNodePosition(
  node: FGNode,
  graphMode: GraphMode,
): GraphNodePosition2D | GraphNodePosition3D | undefined {
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
  graphMode: GraphMode,
): Map<string, GraphNodePosition2D | GraphNodePosition3D> {
  const positions = new Map<string, GraphNodePosition2D | GraphNodePosition3D>();

  for (const node of nodes) {
    const position = readNodePosition(node, graphMode);
    if (position) {
      positions.set(node.id, position);
    }
  }

  return positions;
}
