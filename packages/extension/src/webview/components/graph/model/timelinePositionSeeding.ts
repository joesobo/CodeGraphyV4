import type { IGraphEdge } from '../../../../shared/graph/contracts';
import type { FGNode } from './build';

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

function resolveSeedNeighbor(
  node: FGNode,
  edges: IGraphEdge[],
  nodePositionMap: ReadonlyMap<string, FGNode>,
): FGNode | undefined {
  if (hasNodePosition(node)) {
    return undefined;
  }

  return getConnectedNeighbor(node.id, findConnectedEdge(node.id, edges), nodePositionMap);
}

function seedNodePosition(
  node: FGNode,
  neighborX: number,
  neighborY: number,
  random: () => number,
): void {
  node.x = neighborX + (random() - 0.5) * 40;
  node.y = neighborY + (random() - 0.5) * 40;
}

export function seedTimelinePositions(
  nodes: FGNode[],
  edges: IGraphEdge[],
  previousPositions: Map<string, { x: number | undefined; y: number | undefined }> | null,
  random: () => number
): void {
  if (!previousPositions || previousPositions.size === 0) return;

  const nodePositionMap = new Map(nodes.map((node) => [node.id, node]));

  for (const node of nodes) {
    const neighbor = resolveSeedNeighbor(node, edges, nodePositionMap);
    if (neighbor?.x === undefined || neighbor?.y === undefined) continue;

    seedNodePosition(node, neighbor.x, neighbor.y, random);
  }
}
