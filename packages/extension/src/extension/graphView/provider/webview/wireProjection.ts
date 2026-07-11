import type { IGraphData, IGraphNode } from '../../../../shared/graph/contracts';
import type { GraphDataPatch } from '../../../../shared/graph/patch';

function projectNode(node: IGraphNode): IGraphNode {
  if (!Object.prototype.hasOwnProperty.call(node, 'favorite')) return node;

  const projected = { ...node };
  delete projected.favorite;
  return projected;
}

function projectNodes(nodes: IGraphNode[]): IGraphNode[] {
  const projected = nodes.map(projectNode);
  return projected.some((node, index) => node !== nodes[index]) ? projected : nodes;
}

function projectGraphData(graph: IGraphData): IGraphData {
  const nodes = projectNodes(graph.nodes);
  return nodes === graph.nodes ? graph : { ...graph, nodes };
}

function projectGraphPatch(patch: GraphDataPatch): GraphDataPatch {
  const addedNodes = projectNodes(patch.addedNodes);
  const updatedNodes = projectNodes(patch.updatedNodes);
  return addedNodes === patch.addedNodes && updatedNodes === patch.updatedNodes
    ? patch
    : { ...patch, addedNodes, updatedNodes };
}

export function projectGraphMessageForWebview(message: unknown): unknown {
  if (!message || typeof message !== 'object') return message;
  const candidate = message as { payload?: unknown; type?: unknown };
  if (candidate.type === 'GRAPH_DATA_UPDATED') {
    return { ...candidate, payload: projectGraphData(candidate.payload as IGraphData) };
  }
  if (candidate.type === 'GRAPH_DATA_PATCHED') {
    return { ...candidate, payload: projectGraphPatch(candidate.payload as GraphDataPatch) };
  }
  return message;
}
