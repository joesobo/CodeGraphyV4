import type { IGraphData, IGraphNode } from '../../../../../shared/graph/contracts';

export const MAX_DETAILED_RENDER_NODES = 100_000;

function isOverviewNode(node: IGraphNode): boolean {
  return node.nodeType !== 'symbol'
    && node.nodeType !== 'variable'
    && node.symbol === undefined;
}

export function projectGraphForRendering(
  graph: IGraphData,
  maxDetailedNodes = MAX_DETAILED_RENDER_NODES,
): IGraphData {
  if (graph.nodes.length <= maxDetailedNodes) {
    return graph;
  }

  const nodes = graph.nodes.filter(isOverviewNode);
  const nodeIds = new Set(nodes.map(node => node.id));
  return {
    nodes,
    edges: graph.edges.filter(edge =>
      nodeIds.has(edge.from) && nodeIds.has(edge.to)
    ),
  };
}
