import * as path from 'path';
import { DEFAULT_NODE_COLOR, DEFAULT_PACKAGE_NODE_COLOR } from '../fileColors';
import type { IGraphNode } from './contracts';
import {
  getExternalPackageLabelFromNodeId,
  isExternalPackageNodeId,
} from './packageSpecifiers/nodeId';

const GIT_IGNORED_REASON = 'Git ignored';

function createExternalPackageNode(filePath: string): IGraphNode {
  return {
    id: filePath,
    label: getExternalPackageLabelFromNodeId(filePath),
    color: DEFAULT_PACKAGE_NODE_COLOR,
    nodeType: 'package',
    shape2D: 'hexagon',
  };
}

function createWorkspaceFileNode(
  filePath: string,
  cacheFiles: Record<string, { size?: number }>,
  gitIgnored: boolean,
): IGraphNode {
  return {
    id: filePath,
    label: path.basename(filePath),
    color: DEFAULT_NODE_COLOR,
    fileSize: cacheFiles[filePath]?.size,
    ...(gitIgnored
      ? { metadata: { gitIgnored: true, gitIgnoredReason: GIT_IGNORED_REASON } }
      : {}),
  };
}

export function buildWorkspaceFileNodes(options: {
  cacheFiles: Record<string, { size?: number }>;
  connectedIds: ReadonlySet<string>;
  gitIgnoredPathSet: ReadonlySet<string>;
  nodeIds: ReadonlySet<string>;
  showOrphans: boolean;
}): IGraphNode[] {
  const nodes: IGraphNode[] = [];

  for (const filePath of options.nodeIds) {
    if (!options.showOrphans && !options.connectedIds.has(filePath)) {
      continue;
    }

    nodes.push(isExternalPackageNodeId(filePath)
      ? createExternalPackageNode(filePath)
      : createWorkspaceFileNode(
          filePath,
          options.cacheFiles,
          options.gitIgnoredPathSet.has(filePath),
        ));
  }

  return nodes;
}
