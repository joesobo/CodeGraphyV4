import type { IGraphNode } from '../../graph/contracts';
import type { VisibleGraphCollapseConfig } from '../contracts';
import { FOLDER_NODE_TYPE, getNodeType } from '../model';

export function collectFolderIds(nodes: readonly IGraphNode[]): Set<string> {
  return new Set(
    nodes
      .filter((node) => getNodeType(node) === FOLDER_NODE_TYPE)
      .map((node) => node.id),
  );
}

export function collectCollapsedFolderIds(
  config: VisibleGraphCollapseConfig | undefined,
  folderIds: ReadonlySet<string>,
): Set<string> {
  return new Set(
    (config?.collapsedNodeIds ?? []).filter((nodeId) => folderIds.has(nodeId)),
  );
}
