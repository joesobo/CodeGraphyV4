import type { IGraphNode } from '../../../shared/graph/contracts';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
} from '../../../shared/fileColors';
import type { IGraphNodeTypeDefinition } from '../../../shared/graphControls/contracts';
import { CORE_GRAPH_NODE_TYPES } from '../../../shared/graphControls/defaults/nodeTypes';
import { symbolMatchesScopedDefinition } from '../../../shared/visibleGraph/scope/symbolMatch';
import { isPluginScopedGraphNodeType } from '../../../shared/graphControls/pluginScope';

function getResolvedNodeType(node: IGraphNode): string {
  return node.nodeType ?? 'file';
}

function getSymbolDefinitionSpecificity(definition: IGraphNodeTypeDefinition): number {
  return [
    definition.matchSymbolKinds,
    definition.matchSymbolPluginKind,
    definition.matchSymbolSource,
    definition.matchSymbolLanguage,
    definition.matchSymbolFilePath,
  ].filter(Boolean).length;
}

function getColorNodeType(node: IGraphNode, nodeColors: Record<string, string>): string {
  const symbolDefinition = CORE_GRAPH_NODE_TYPES
    .filter((definition) => definition.parentId && nodeColors[definition.id])
    .filter((definition) => symbolMatchesScopedDefinition(node, definition))
    .sort((left, right) =>
      getSymbolDefinitionSpecificity(right) - getSymbolDefinitionSpecificity(left)
    )[0];

  return symbolDefinition?.id ?? getResolvedNodeType(node);
}

export function isNodeVisible(node: IGraphNode, visibility: Record<string, boolean>): boolean {
  const nodeType = getResolvedNodeType(node);
  return visibility[nodeType] ?? !isPluginScopedGraphNodeType(nodeType);
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
    const nodeType = getColorNodeType(node, nodeColors);

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

export function getFolderNodes(nodes: IGraphNode[]): IGraphNode[] {
  return nodes.filter((node) => getResolvedNodeType(node) === 'folder');
}
