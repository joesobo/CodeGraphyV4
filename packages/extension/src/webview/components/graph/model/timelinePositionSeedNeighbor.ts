import type { IGraphEdge } from '../../../../shared/graph/contracts';
import type { FGNode } from './build';

function hasNodePosition(node: Pick<FGNode, 'x' | 'y'>): boolean {
  return node.x !== undefined || node.y !== undefined;
}

function findConnectedEdge(nodeId: string, edges: readonly IGraphEdge[]): IGraphEdge | undefined {
  return edges.find((candidate) => candidate.from === nodeId || candidate.to === nodeId);
}

function getConnectedNeighbor(
  nodeId: string,
  edge: IGraphEdge | undefined,
  nodePositionMap: ReadonlyMap<string, FGNode>,
): FGNode | undefined {
  if (!edge) {
    return undefined;
  }

  const neighborId = edge.from === nodeId ? edge.to : edge.from;
  return nodePositionMap.get(neighborId);
}

export function resolveTimelineSeedNeighbor(
  node: FGNode,
  edges: readonly IGraphEdge[],
  nodePositionMap: ReadonlyMap<string, FGNode>,
): FGNode | undefined {
  if (hasNodePosition(node)) {
    return undefined;
  }

  return getConnectedNeighbor(node.id, findConnectedEdge(node.id, edges), nodePositionMap);
}
