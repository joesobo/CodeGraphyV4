import type { IGraphData } from '@codegraphy-dev/plugin-api';

export function collectFolderPaths(nodes: IGraphData['nodes']): Set<string> {
  const paths = new Set<string>();
  for (const node of nodes) {
    const segments = node.id.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      paths.add(segments.slice(0, index).join('/'));
    }
  }
  if (nodes.some((node) => !node.id.includes('/'))) {
    paths.add('(root)');
  }
  return paths;
}

export function isExternalPackageNodeId(nodeId: string): boolean {
  return nodeId.startsWith('pkg:');
}
