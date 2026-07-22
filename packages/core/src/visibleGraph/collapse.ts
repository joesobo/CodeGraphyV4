import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphCollapseConfig } from './contracts';
import { projectCollapsedEdges } from './collapseEdges';
import { findVisibleCollapsedAncestor } from './collapsePaths';
import { FOLDER_NODE_TYPE, getNodeType } from './model';

export function applyCollapseProjection(
  graphData: IGraphData,
  config?: VisibleGraphCollapseConfig,
): IGraphData {
  const folderIds = new Set(
    graphData.nodes
      .filter((node) => getNodeType(node) === FOLDER_NODE_TYPE)
      .map((node) => node.id),
  );
  const collapsedFolderIds = new Set(
    (config?.collapsedNodeIds ?? []).filter((nodeId) => folderIds.has(nodeId)),
  );

  if (collapsedFolderIds.size === 0) {
    return graphData;
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
    });

  return {
    nodes,
    edges: projectCollapsedEdges(graphData.edges, nodes, hiddenByNodeId),
  };
}
