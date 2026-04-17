import type { IGraphEdge } from '../../../../../shared/graph/contracts';
import type { FGNode } from '../build';

function hasNodePosition(node: Pick<FGNode, 'x' | 'y'>): boolean {
  return node.x !== undefined || node.y !== undefined;
}

function findConnectedEdge(nodeId: string, edges: IGraphEdge[]): IGraphEdge | undefined {
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

export function resolveSeedNeighbor(
  node: FGNode,
  edges: IGraphEdge[],
  nodePositionMap: ReadonlyMap<string, FGNode>,
): FGNode | undefined {
  if (hasNodePosition(node)) {
    return undefined;
  }

  return getConnectedNeighbor(node.id, findConnectedEdge(node.id, edges), nodePositionMap);
}

export function seedNodePosition(
  node: FGNode,
  neighborX: number,
  neighborY: number,
  random: () => number,
): void {
  node.x = neighborX + (random() - 0.5) * 40;
  node.y = neighborY + (random() - 0.5) * 40;
}
