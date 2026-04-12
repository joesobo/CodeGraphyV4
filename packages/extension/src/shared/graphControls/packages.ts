import type { IGraphData } from '../graph/types';
import { STRUCTURAL_NESTS_EDGE_KIND } from './defaults';

export const WORKSPACE_PACKAGE_NODE_ID_PREFIX = 'pkg:workspace:' as const;

function isFileNode(node: IGraphData['nodes'][number]): boolean {
  return (node.nodeType ?? 'file') === 'file';
}

function isPackageManifestPath(nodeId: string): boolean {
  return nodeId === 'package.json' || nodeId.endsWith('/package.json');
}

function getWorkspacePackageRootFromManifest(nodeId: string): string {
  return nodeId === 'package.json'
    ? '.'
    : nodeId.slice(0, -'/package.json'.length);
}

function getWorkspacePackageNodeId(rootPath: string): string {
  return `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}${rootPath}`;
}

function getWorkspacePackageLabel(rootPath: string): string {
  if (rootPath === '.') {
    return 'workspace';
  }

  return rootPath.split('/').pop() ?? rootPath;
}

function getNearestWorkspacePackageRoot(
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

export function createWorkspacePackageNodes(
  packageRoots: ReadonlySet<string>,
  packageNodeColor: string,
): Array<{
  id: string;
  label: string;
  color: string;
  nodeType: 'package';
  shape2D: 'hexagon';
  shape3D: 'cube';
}> {
  return [...packageRoots]
    .sort((left, right) => left.localeCompare(right))
    .map((rootPath) => ({
      id: getWorkspacePackageNodeId(rootPath),
      label: getWorkspacePackageLabel(rootPath),
      color: packageNodeColor,
      nodeType: 'package',
      shape2D: 'hexagon',
      shape3D: 'cube',
    }));
}

export function buildWorkspacePackageEdges(
  packageRoots: ReadonlySet<string>,
  nodes: IGraphData['nodes'],
): IGraphData['edges'] {
  const edges: IGraphData['edges'] = [];

  for (const node of nodes) {
    if (!isFileNode(node)) {
      continue;
    }

    const packageRoot = getNearestWorkspacePackageRoot(node.id, packageRoots);
    if (!packageRoot) {
      continue;
    }

    const packageNodeId = getWorkspacePackageNodeId(packageRoot);
    edges.push({
      id: `${packageNodeId}->${node.id}#${STRUCTURAL_NESTS_EDGE_KIND}`,
      from: packageNodeId,
      to: node.id,
      kind: STRUCTURAL_NESTS_EDGE_KIND,
      sources: [],
    });
  }

  return edges;
}
