import type { FGNode } from '../../../model/build';
import { isFiniteNumber } from '../../physics/numeric';

export interface GraphNodePosition2D {
  x: number;
  y: number;
}

export function readNodePosition(
  node: FGNode,
): GraphNodePosition2D | undefined {
  if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
    return undefined;
  }

  return { x: node.x, y: node.y };
}

export function createGraphNodePositionMap(
  nodes: readonly FGNode[],
): Map<string, GraphNodePosition2D> {
  const positions = new Map<string, GraphNodePosition2D>();

  for (const node of nodes) {
    const position = readNodePosition(node);
    if (position) positions.set(node.id, position);
  }

  return positions;
}
