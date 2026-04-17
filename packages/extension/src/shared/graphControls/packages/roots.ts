import type { IGraphData } from '../../graph/contracts';
import { isFileNode } from './workspace';

function isPackageManifestPath(nodeId: string): boolean {
  return nodeId === 'package.json' || nodeId.endsWith('/package.json');
}

function getWorkspacePackageRootFromManifest(nodeId: string): string {
  return nodeId === 'package.json'
    ? '.'
    : nodeId.slice(0, -'/package.json'.length);
}

export function getNearestWorkspacePackageRoot(
  filePath: string,
  packageRoots: ReadonlySet<string>,
): string | null {
  let bestMatch: string | null = null;

  for (const rootPath of packageRoots) {
    if (rootPath === '.') {
      bestMatch ??= rootPath;
      continue;
    }

    if (filePath === rootPath || filePath.startsWith(`${rootPath}/`)) {
      if (!bestMatch || rootPath.length > bestMatch.length) {
        bestMatch = rootPath;
      }
    }
  }

  return bestMatch;
}

export function collectWorkspacePackageRoots(
  nodes: IGraphData['nodes'],
): Set<string> {
  const packageRoots = new Set<string>();

  for (const node of nodes) {
    if (!isFileNode(node) || !isPackageManifestPath(node.id)) {
      continue;
    }

    packageRoots.add(getWorkspacePackageRootFromManifest(node.id));
  }

  return packageRoots;
}
