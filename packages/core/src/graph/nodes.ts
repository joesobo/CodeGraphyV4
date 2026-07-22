/**
 * @fileoverview Node-building helpers for workspace graph data.
 * @module core/workspaceGraphNodes
 */

import type { IGraphNode } from './contracts';
import { buildWorkspaceFileNodes } from './fileNodes';
import { buildDiscoveredDirectoryNodes, normalizeDirectoryPath } from './folderNodes';

export interface IWorkspaceGraphNodesOptions {
  cacheFiles: Record<string, { size?: number }>;
  connectedIds: ReadonlySet<string>;
  directoryPaths?: readonly string[];
  gitIgnoredPaths?: readonly string[];
  nodeIds: ReadonlySet<string>;
  showOrphans: boolean;
}

export function buildWorkspaceGraphNodes(
  options: IWorkspaceGraphNodesOptions,
): IGraphNode[] {
  const {
    cacheFiles,
    connectedIds,
    directoryPaths = [],
    gitIgnoredPaths = [],
    nodeIds,
    showOrphans,
  } = options;

  const gitIgnoredPathSet = new Set(gitIgnoredPaths.map(normalizeDirectoryPath));

  return [
    ...buildWorkspaceFileNodes({
      cacheFiles,
      connectedIds,
      gitIgnoredPathSet,
      nodeIds,
      showOrphans,
    }),
    ...buildDiscoveredDirectoryNodes(directoryPaths, gitIgnoredPathSet, nodeIds),
  ];
}
