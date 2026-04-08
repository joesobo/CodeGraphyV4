import type { IGraphData } from '@codegraphy-vscode/plugin-api';

const FOCUSED_IMPORT_EDGE_KINDS = new Set(['import', 'reexport']);

function isPluginImportEdge(edge: IGraphData['edges'][number], pluginId: string): boolean {
  return (
    FOCUSED_IMPORT_EDGE_KINDS.has(edge.kind)
    && edge.sources.some(source => source.pluginId === pluginId)
  );
}

export function filterPluginImportGraph(data: IGraphData, pluginId: string): IGraphData {
  const edges = data.edges.filter(edge => isPluginImportEdge(edge, pluginId));
  const nodeIds = new Set<string>();

  for (const edge of edges) {
    nodeIds.add(edge.from);
    nodeIds.add(edge.to);
  }

  return {
    nodes: data.nodes.filter(node => nodeIds.has(node.id)),
    edges,
  };
}
