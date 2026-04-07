import type { IGraphData, IGraphNode, IViewContext } from '@codegraphy-vscode/plugin-api';

const FOCUSED_IMPORT_EDGE_KINDS = new Set(['import', 'reexport']);

function filterTypeScriptImportEdges(data: IGraphData, pluginId: string): IGraphData {
  const edges = data.edges.filter(edge =>
    FOCUSED_IMPORT_EDGE_KINDS.has(edge.kind)
    && edge.sources.some(source => source.pluginId === pluginId),
  );
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

function buildUndirectedAdjacencyList(data: IGraphData): Map<string, Set<string>> {
  const adjacencyList = new Map<string, Set<string>>();

  for (const node of data.nodes) {
    adjacencyList.set(node.id, new Set());
  }

  for (const edge of data.edges) {
    adjacencyList.get(edge.from)?.add(edge.to);
    adjacencyList.get(edge.to)?.add(edge.from);
  }

  return adjacencyList;
}

function walkDepthFromNode(
  rootNodeId: string,
  depthLimit: number,
  adjacencyList: Map<string, Set<string>>,
): Map<string, number> {
  const depths = new Map<string, number>();

  if (!adjacencyList.has(rootNodeId)) {
    return depths;
  }

  const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: rootNodeId, depth: 0 }];
  depths.set(rootNodeId, 0);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (!current) continue;

    if (current.depth >= depthLimit) {
      continue;
    }

    for (const neighbor of adjacencyList.get(current.nodeId) ?? []) {
      if (depths.has(neighbor)) continue;
      const nextDepth = current.depth + 1;
      depths.set(neighbor, nextDepth);
      queue.push({ nodeId: neighbor, depth: nextDepth });
    }
  }

  return depths;
}

export function filterFocusedImportGraph(
  data: IGraphData,
  context: IViewContext,
  pluginId: string,
): IGraphData {
  const importGraph = filterTypeScriptImportEdges(data, pluginId);
  const focusedFile = context.focusedFile;
  if (!focusedFile) {
    return importGraph;
  }

  const adjacencyList = buildUndirectedAdjacencyList(importGraph);
  const depthLimit = Math.max(1, context.depthLimit ?? 1);
  const depths = walkDepthFromNode(focusedFile, depthLimit, adjacencyList);
  if (depths.size === 0) {
    return { nodes: [], edges: [] };
  }

  const includedNodeIds = new Set(depths.keys());
  const nodes: IGraphNode[] = importGraph.nodes
    .filter(node => includedNodeIds.has(node.id))
    .map(node => ({
      ...node,
      depthLevel: depths.get(node.id),
    }));
  const edges = importGraph.edges.filter(
    edge => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to),
  );

  return { nodes, edges };
}
