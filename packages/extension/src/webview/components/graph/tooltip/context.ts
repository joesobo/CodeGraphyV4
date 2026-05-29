import type { IGraphData, IGraphNode } from '../../../../shared/graph/contracts';
import type { TooltipContext } from '../../../pluginHost/api/contracts/webview';

export interface GraphTooltipContextOptions {
  node: Pick<IGraphNode, 'id' | 'label' | 'color'>;
  snapshot: Pick<IGraphData, 'nodes' | 'edges'>;
}

export function buildGraphTooltipContext(options: GraphTooltipContextOptions): TooltipContext {
  const { node, snapshot } = options;
  const baseNode =
    snapshot.nodes.find((graphNode) => graphNode.id === node.id) ??
    { id: node.id, label: node.label, color: node.color };
  const connectedEdges = snapshot.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
  const neighborIds = new Set<string>();
  for (const edge of connectedEdges) {
    neighborIds.add(edge.from === node.id ? edge.to : edge.from);
  }

  return {
    node: baseNode,
    neighbors: snapshot.nodes.filter((graphNode) => neighborIds.has(graphNode.id)),
    edges: connectedEdges,
  };
}
