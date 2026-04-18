import type { IGraphData } from '../../graph/contracts';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../defaults/definitions';

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
    const parent = segments.length <= 1
      ? '(root)'
      : segments.slice(0, -1).join('/');
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
