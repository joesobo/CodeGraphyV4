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
  return [...packageRoots]
    .sort((left, right) => right.length - left.length)
    .find(root => (
      root === '.'
      || filePath === root
      || filePath.startsWith(`${root}/`)
    )) ?? null;
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
