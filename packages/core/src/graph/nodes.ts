/**
 * @fileoverview Node-building helpers for workspace graph data.
 * @module core/workspaceGraphNodes
 */

import * as path from 'path';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
} from '../fileColors';
import type { IGraphNode } from './contracts';
import {
  getExternalPackageLabelFromNodeId,
  isExternalPackageNodeId,
} from './packageSpecifiers/nodeId';

const GIT_IGNORED_REASON = 'Git ignored';

export interface IWorkspaceGraphNodesOptions {
  cacheFiles: Record<string, { size?: number }>;
  churnCounts: Record<string, number>;
  connectedIds: ReadonlySet<string>;
  directoryPaths?: readonly string[];
  gitIgnoredPaths?: readonly string[];
  nodeIds: ReadonlySet<string>;
  showOrphans: boolean;
}

function normalizeDirectoryPath(directoryPath: string): string {
  return directoryPath.replace(/\\/g, '/');
}

function collectFolderPathsFromFileNodes(nodeIds: ReadonlySet<string>): Set<string> {
  const folderPaths = new Set<string>();

  for (const nodeId of nodeIds) {
    if (isExternalPackageNodeId(nodeId)) {
      continue;
    }

    const segments = nodeId.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      folderPaths.add(segments.slice(0, index).join('/'));
    }
  }

  return folderPaths;
}

function buildDiscoveredDirectoryNodes(
  directoryPaths: readonly string[],
  gitIgnoredPathSet: ReadonlySet<string>,
  nodeIds: ReadonlySet<string>,
): IGraphNode[] {
  const fileFolderPaths = collectFolderPathsFromFileNodes(nodeIds);
  const seen = new Set<string>();
  const nodes: IGraphNode[] = [];

  for (const directoryPath of directoryPaths) {
    const normalizedPath = normalizeDirectoryPath(directoryPath);
    const isGitIgnoredDirectory = gitIgnoredPathSet.has(normalizedPath);
    if (
      !normalizedPath
      || (!isGitIgnoredDirectory && fileFolderPaths.has(normalizedPath))
      || seen.has(normalizedPath)
    ) {
      continue;
    }

    seen.add(normalizedPath);
    nodes.push({
      id: normalizedPath,
      label: normalizedPath.split('/').pop() ?? normalizedPath,
      color: DEFAULT_FOLDER_NODE_COLOR,
      nodeType: 'folder',
      ...(isGitIgnoredDirectory
        ? { metadata: { gitIgnored: true, gitIgnoredReason: GIT_IGNORED_REASON } }
        : {}),
    });
  }

  return nodes;
}

export function buildWorkspaceGraphNodes(
  options: IWorkspaceGraphNodesOptions,
): IGraphNode[] {
  const {
    cacheFiles,
    churnCounts,
    connectedIds,
    directoryPaths = [],
    gitIgnoredPaths = [],
    nodeIds,
    showOrphans,
  } = options;

  const nodes: IGraphNode[] = [];
  const gitIgnoredPathSet = new Set(gitIgnoredPaths.map(normalizeDirectoryPath));

  for (const filePath of nodeIds) {
    if (!showOrphans && !connectedIds.has(filePath)) {
      continue;
    }

    if (isExternalPackageNodeId(filePath)) {
      nodes.push({
        id: filePath,
        label: getExternalPackageLabelFromNodeId(filePath),
        color: DEFAULT_PACKAGE_NODE_COLOR,
        nodeType: 'package',
        shape2D: 'hexagon',
        shape3D: 'cube',
      });
      continue;
    }

    nodes.push({
      id: filePath,
      label: path.basename(filePath),
      color: DEFAULT_NODE_COLOR,
      fileSize: cacheFiles[filePath]?.size,
      churn: churnCounts[filePath] ?? 0,
      ...(gitIgnoredPathSet.has(filePath)
        ? { metadata: { gitIgnored: true, gitIgnoredReason: GIT_IGNORED_REASON } }
        : {}),
    });
  }

  return [
    ...nodes,
    ...buildDiscoveredDirectoryNodes(directoryPaths, gitIgnoredPathSet, nodeIds),
  ];
}
