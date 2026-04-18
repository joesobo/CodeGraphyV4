import type { IGraphData } from '../../../../shared/graph/contracts';
import { getGraphIndex } from '../index/cache';
import type { GraphDataGetter } from '../facade';

function collectReachableNodeIds(
  nodeId: string,
  hops: number,
  graph: ReturnType<typeof getGraphIndex>['graph'],
): Set<string> {
  const queue: Array<{ depth: number; id: string }> = [{ depth: 0, id: nodeId }];
  const visited = new Set<string>([nodeId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= hops) {
      continue;
    }

    for (const neighborId of graph.neighbors(current.id)) {
      if (visited.has(neighborId)) {
        continue;
      }

      visited.add(neighborId);
      queue.push({ depth: current.depth + 1, id: neighborId });
    }
  }

  return visited;
}

export function buildSubgraph(
  nodeId: string,
  hops: number,
  getGraphData: GraphDataGetter,
): IGraphData {
  const graphData = getGraphData();
  const { graph } = getGraphIndex(graphData);
  if (!graph.hasNode(nodeId) || hops < 0) {
    return { nodes: [], edges: [] };
  }

  const visited = collectReachableNodeIds(nodeId, hops, graph);

  return {
    nodes: graphData.nodes.filter((node) => visited.has(node.id)),
    edges: graphData.edges.filter(
      (edge) => visited.has(edge.from) && visited.has(edge.to),
    ),
  };
}
