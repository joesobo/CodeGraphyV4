import { getWorkspacePackageNodeId } from './workspace';

function getWorkspacePackageLabel(rootPath: string): string {
  if (rootPath === '.') {
    return 'workspace';
  }

  return rootPath.split('/').pop() ?? rootPath;
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
