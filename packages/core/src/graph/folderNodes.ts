import { DEFAULT_FOLDER_NODE_COLOR } from '../fileColors';
import type { IGraphNode } from './contracts';
import { isExternalPackageNodeId } from './packageSpecifiers/nodeId';

const GIT_IGNORED_REASON = 'Git ignored';

export function normalizeDirectoryPath(directoryPath: string): string {
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

function createDirectoryNode(directoryPath: string, gitIgnored: boolean): IGraphNode {
  return {
    id: directoryPath,
    label: directoryPath.split('/').pop() ?? directoryPath,
    color: DEFAULT_FOLDER_NODE_COLOR,
    nodeType: 'folder',
    ...(gitIgnored
      ? { metadata: { gitIgnored: true, gitIgnoredReason: GIT_IGNORED_REASON } }
      : {}),
  };
}

export function buildDiscoveredDirectoryNodes(
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
    const alreadyRepresented = !isGitIgnoredDirectory && fileFolderPaths.has(normalizedPath);
    if (!normalizedPath || alreadyRepresented || seen.has(normalizedPath)) {
      continue;
    }

    seen.add(normalizedPath);
    nodes.push(createDirectoryNode(normalizedPath, isGitIgnoredDirectory));
  }

  return nodes;
}
