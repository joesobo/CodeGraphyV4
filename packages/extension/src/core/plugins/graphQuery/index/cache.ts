import { MultiDirectedGraph } from 'graphology';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../../shared/graph/contracts';

export interface GraphIndex {
  edgeById: Map<string, IGraphEdge>;
  graph: MultiDirectedGraph<{ node: IGraphNode }, { edge: IGraphEdge }>;
  nodeById: Map<string, IGraphNode>;
}

const graphIndexCache = new WeakMap<IGraphData, GraphIndex>();

export function getGraphIndex(graphData: IGraphData): GraphIndex {
  const cached = graphIndexCache.get(graphData);
  if (cached) {
    return cached;
  }

  const graph = new MultiDirectedGraph<{ node: IGraphNode }, { edge: IGraphEdge }>();
  const nodeById = new Map<string, IGraphNode>();
  const edgeById = new Map<string, IGraphEdge>();

  for (const node of graphData.nodes) {
    graph.addNode(node.id, { node });
    nodeById.set(node.id, node);
  }

  for (const edge of graphData.edges) {
    if (!graph.hasNode(edge.from) || !graph.hasNode(edge.to)) {
      continue;
    }

    graph.addDirectedEdgeWithKey(edge.id, edge.from, edge.to, { edge });
    edgeById.set(edge.id, edge);
  }

  const index = { edgeById, graph, nodeById };
  graphIndexCache.set(graphData, index);
  return index;
}

export function getEdgesByKeys(
  keys: string[],
  edgeById: Map<string, IGraphEdge>,
): IGraphEdge[] {
  return keys
    .map((key) => edgeById.get(key))
    .filter((edge): edge is IGraphEdge => Boolean(edge));
}
