import {
  CORE_GRAPH_EDGE_DEFAULT_VISIBILITY,
  type IGraphData,
} from '@codegraphy-dev/core';

export function projectDefaultFileGraph(graph: IGraphData): IGraphData {
  const nodes = graph.nodes.filter(node => (node.nodeType ?? 'file') === 'file');
  const nodeIds = new Set<string>(nodes.map(node => node.id));
  const edges = graph.edges.filter(edge => (
    nodeIds.has(edge.from)
    && nodeIds.has(edge.to)
    && CORE_GRAPH_EDGE_DEFAULT_VISIBILITY[edge.kind] === true
  ));
  return { nodes, edges };
}
