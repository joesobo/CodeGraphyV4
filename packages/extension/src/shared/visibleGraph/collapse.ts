import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphCollapseConfig } from './contracts';
import { findVisibleCollapsedAncestor } from './collapse/ancestors';
import { annotateCollapsibleFolders, annotateFolderNode } from './collapse/annotation';
import { projectCollapsedEdges } from './collapse/edges';
import { collectCollapsedFolderIds, collectFolderIds } from './collapse/folders';

export function applyCollapseProjection(
  graphData: IGraphData,
  config?: VisibleGraphCollapseConfig,
): IGraphData {
  const folderIds = collectFolderIds(graphData.nodes);
  const collapsedFolderIds = collectCollapsedFolderIds(config, folderIds);

  if (collapsedFolderIds.size === 0) {
    return annotateCollapsibleFolders(graphData, folderIds);
  }

  const hiddenByNodeId = new Map<string, string>();
  const nodes = graphData.nodes
    .filter((node) => {
      const ownerId = findVisibleCollapsedAncestor(node.id, collapsedFolderIds);
      if (!ownerId || ownerId === node.id) {
        return true;
      }

      hiddenByNodeId.set(node.id, ownerId);
      return false;
    })
    .map((node) => annotateFolderNode(node, folderIds, graphData.nodes, collapsedFolderIds, hiddenByNodeId));

  return {
    nodes,
    edges: projectCollapsedEdges(graphData.edges, nodes, hiddenByNodeId),
  };
}
