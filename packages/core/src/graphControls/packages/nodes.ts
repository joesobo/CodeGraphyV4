import { getWorkspacePackageNodeId } from './workspace';

function getWorkspacePackageLabel(rootPath: string): string {
  if (rootPath === '.') {
    return 'workspace';
  }

  return rootPath.split('/').pop() ?? rootPath;
}

export function createWorkspacePackageNodes(
  packageRoots: ReadonlySet<string>,
): Array<{
  id: string;
  label: string;
  nodeType: 'package';
}> {
  return [...packageRoots]
    .sort((left, right) => left.localeCompare(right))
    .map((rootPath) => ({
      id: getWorkspacePackageNodeId(rootPath),
      label: getWorkspacePackageLabel(rootPath),
      nodeType: 'package',
    }));
}
