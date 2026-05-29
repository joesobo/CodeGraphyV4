import type { IGraphData, IGraphNode } from '../../graph/contracts';
import { isDescendantOf } from './ancestors';

export function annotateCollapsibleFolders(
  graphData: IGraphData,
  folderIds: ReadonlySet<string>,
): IGraphData {
  return {
    nodes: graphData.nodes.map((node) => annotateFolderNode(node, folderIds, graphData.nodes, new Set(), new Map())),
    edges: graphData.edges,
  };
}

export function annotateFolderNode(
  node: IGraphNode,
  folderIds: ReadonlySet<string>,
  sourceNodes: readonly IGraphNode[],
  collapsedFolderIds: ReadonlySet<string>,
  hiddenByNodeId: ReadonlyMap<string, string>,
): IGraphNode {
  if (!folderIds.has(node.id)) {
    return node;
  }

  const nextNode: IGraphNode = {
    ...node,
    isCollapsible: hasDescendant(node.id, sourceNodes),
    isCollapsed: collapsedFolderIds.has(node.id),
  };

  if (nextNode.isCollapsed) {
    nextNode.collapsedDescendantCount = countCollapsedDescendants(node.id, hiddenByNodeId);
  }

  return nextNode;
}

export function countCollapsedDescendants(
  folderId: string,
  hiddenByNodeId: ReadonlyMap<string, string>,
): number {
  let count = 0;
  for (const ownerId of hiddenByNodeId.values()) {
    if (ownerId === folderId) {
      count += 1;
    }
  }

  return count;
}

function hasDescendant(folderId: string, nodes: readonly IGraphNode[]): boolean {
  return nodes.some((node) => isDescendantOf(folderId, node.id));
}
