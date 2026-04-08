import type { IGraphData } from '../graph/types';
import { STRUCTURAL_NESTS_EDGE_KIND } from './defaults';

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

export function createFolderNodes(
  folderPaths: Set<string>,
  folderNodeColor: string,
): Array<{ id: string; label: string; color: string; nodeType: 'folder' }> {
  return Array.from(folderPaths).map((folderPath) => ({
    id: folderPath,
    label: folderPath.split('/').pop()!,
    color: folderNodeColor,
    nodeType: 'folder',
  }));
}

export function buildContainmentEdges(
  folderPaths: Set<string>,
  nodes: IGraphData['nodes'],
): IGraphData['edges'] {
  const edges: IGraphData['edges'] = [];

  for (const folderPath of folderPaths) {
    if (folderPath === '(root)') {
      continue;
    }

    const segments = folderPath.split('/');
    if (segments.length <= 1) {
      continue;
    }

    const parent = segments.slice(0, -1).join('/');
    edges.push({
      id: `${parent}->${folderPath}#${STRUCTURAL_NESTS_EDGE_KIND}`,
      from: parent,
      to: folderPath,
      kind: STRUCTURAL_NESTS_EDGE_KIND,
      sources: [],
    });
  }

  for (const node of nodes) {
    const segments = node.id.split('/');
    const parent = segments.length === 1 ? '(root)' : segments.slice(0, -1).join('/');
    edges.push({
      id: `${parent}->${node.id}#${STRUCTURAL_NESTS_EDGE_KIND}`,
      from: parent,
      to: node.id,
      kind: STRUCTURAL_NESTS_EDGE_KIND,
      sources: [],
    });
  }

  return edges;
}
