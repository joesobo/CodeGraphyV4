import type { IGraphData } from '../graph/contracts';
import { filterEdgesToNodes } from './model';

export function applyShowOrphans(graphData: IGraphData, showOrphans: boolean): IGraphData {
  if (showOrphans) {
    return graphData;
  }

  const connectedNodeIds = new Set<string>();
  for (const edge of graphData.edges) {
    connectedNodeIds.add(edge.from);
    connectedNodeIds.add(edge.to);
  }

  const nodes = graphData.nodes.filter((node) => connectedNodeIds.has(node.id));

  return {
    nodes,
    edges: filterEdgesToNodes(graphData.edges, nodes),
  };
}
