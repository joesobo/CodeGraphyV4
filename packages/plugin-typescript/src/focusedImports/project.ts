import type { IGraphData, IGraphNode } from '@codegraphy-vscode/plugin-api';

export function projectFocusedImportGraph(
  data: IGraphData,
  depths: Map<string, number>,
): IGraphData {
  if (depths.size === 0) {
    return { nodes: [], edges: [] };
  }

  const includedNodeIds = new Set(depths.keys());
  const nodes: IGraphNode[] = data.nodes
    .filter(node => includedNodeIds.has(node.id))
    .map(node => ({
      ...node,
      depthLevel: depths.get(node.id),
    }));
  const edges = data.edges.filter(
    edge => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to),
  );

  return { nodes, edges };
}
