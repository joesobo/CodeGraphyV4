import type { IGraphData } from '../../graph/contracts';

export function collectFolderPaths(
  nodes: IGraphData['nodes'],
): { paths: Set<string>; hasRootFiles: boolean } {
  const folderPaths = new Set<string>();

  for (const node of nodes) {
    const segments = node.id.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      folderPaths.add(segments.slice(0, index).join('/'));
    }
  }

  const hasRootFiles = nodes.some((node) => !node.id.includes('/'));
  if (hasRootFiles) {
    folderPaths.add('(root)');
  }

  return { paths: folderPaths, hasRootFiles };
}

function addFolderPathWithAncestors(folderPaths: Set<string>, folderPath: string): void {
  const segments = folderPath.split('/');
  for (let index = 1; index <= segments.length; index += 1) {
    folderPaths.add(segments.slice(0, index).join('/'));
  }
}

export function collectStructuralFolderPaths(
  fileNodes: IGraphData['nodes'],
  folderNodes: IGraphData['nodes'],
): { paths: Set<string>; hasRootFiles: boolean } {
  const result = collectFolderPaths(fileNodes);

  for (const folderNode of folderNodes) {
    addFolderPathWithAncestors(result.paths, folderNode.id);
  }

  return result;
}

export function createFolderNodes(
  folderPaths: Set<string>,
): Array<{ id: string; label: string; nodeType: 'folder' }> {
  return Array.from(folderPaths).map((folderPath) => ({
    id: folderPath,
    label: folderPath.split('/').pop()!,
    nodeType: 'folder',
  }));
}
