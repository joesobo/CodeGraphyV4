import type { IGraphNode } from '../../../shared/graph/types';
import { getGraphIndex } from './cache';
import type { GraphDataGetter } from './facade';

function buildPreviousNodeMap(
  fromId: string,
  graph: ReturnType<typeof getGraphIndex>['graph'],
): Map<string, string | null> {
  const queue = [fromId];
  const previous = new Map<string, string | null>([[fromId, null]]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    for (const neighborId of graph.outNeighbors(currentId)) {
      if (previous.has(neighborId)) {
        continue;
      }

      previous.set(neighborId, currentId);
      queue.push(neighborId);
    }
  }

  return previous;
}

function collectNodePath(
  toId: string,
  previous: ReadonlyMap<string, string | null>,
): string[] {
  const nodeIds: string[] = [];
  let cursor: string | null = toId;

  while (cursor) {
    nodeIds.push(cursor);
    cursor = previous.get(cursor) ?? null;
  }

  return nodeIds.reverse();
}

export function findNodePath(
  fromId: string,
  toId: string,
  getGraphData: GraphDataGetter,
): IGraphNode[] | null {
  const { graph, nodeById } = getGraphIndex(getGraphData());
  if (!graph.hasNode(fromId) || !graph.hasNode(toId)) {
    return null;
  }

  const previous = buildPreviousNodeMap(fromId, graph);

  if (!previous.has(toId)) {
    return null;
  }

  return collectNodePath(toId, previous).map((id) => nodeById.get(id)!);
}
