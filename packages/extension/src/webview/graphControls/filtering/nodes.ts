import type { IGraphNode } from '../../../shared/graph/contracts';

function getResolvedNodeType(node: IGraphNode): string {
  return node.nodeType ?? 'file';
}

export function isNodeVisible(node: IGraphNode, visibility: Record<string, boolean>): boolean {
  return visibility[getResolvedNodeType(node)] ?? true;
}

export function withResolvedNodeTypes(nodes: IGraphNode[]): IGraphNode[] {
  return nodes.map((node) => ({
    ...node,
    nodeType: node.nodeType ?? 'file',
  }));
}

export function applyNodeTypeColors(
  nodes: IGraphNode[],
  nodeColors: Record<string, string>,
): IGraphNode[] {
  return nodes.map((node) => ({
    ...node,
    color: nodeColors[getResolvedNodeType(node)] ?? node.color,
  }));
}

export function getFileNodes(nodes: IGraphNode[]): IGraphNode[] {
  return nodes.filter((node) => getResolvedNodeType(node) === 'file');
}
