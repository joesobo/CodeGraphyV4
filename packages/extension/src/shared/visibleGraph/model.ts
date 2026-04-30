import type { IGraphData, IGraphEdge, IGraphNode } from '../graph/contracts';

export const DEFAULT_FILE_NODE_TYPE = 'file';
export const FOLDER_NODE_TYPE = 'folder';
export const PACKAGE_NODE_TYPE = 'package';
export const STRUCTURAL_NESTS_EDGE_KIND: IGraphEdge['kind'] = 'nests';

export function getNodeType(node: IGraphNode): string {
  return node.nodeType ?? DEFAULT_FILE_NODE_TYPE;
}

export function isFileNode(node: IGraphNode): boolean {
  return getNodeType(node) === DEFAULT_FILE_NODE_TYPE;
}

export function getEnabledTypes(items: readonly { type: string; enabled: boolean }[]): Set<string> {
  return new Set(items.filter((item) => item.enabled).map((item) => item.type));
}

export function getDisabledTypes(items: readonly { type: string; enabled: boolean }[]): Set<string> {
  return new Set(items.filter((item) => !item.enabled).map((item) => item.type));
}

export function filterEdgesToNodes(edges: IGraphData['edges'], nodes: IGraphData['nodes']): IGraphData['edges'] {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
}
