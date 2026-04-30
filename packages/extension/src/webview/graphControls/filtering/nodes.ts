import type { IGraphNode } from '../../../shared/graph/contracts';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
} from '../../../shared/fileColors';

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
  return nodes.map((node) => {
    const nodeType = getResolvedNodeType(node);

    return {
      ...node,
      color: (nodeColors[nodeType] ?? node.color) || getFallbackColor(nodeType),
    };
  });
}

function getFallbackColor(nodeType: string): string {
  if (nodeType === 'folder') {
    return DEFAULT_FOLDER_NODE_COLOR;
  }

  if (nodeType === 'package') {
    return DEFAULT_PACKAGE_NODE_COLOR;
  }

  return DEFAULT_NODE_COLOR;
}

export function getFileNodes(nodes: IGraphNode[]): IGraphNode[] {
  return nodes.filter((node) => getResolvedNodeType(node) === 'file');
}
