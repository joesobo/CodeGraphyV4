/**
 * @fileoverview Edge creation for folder view containment hierarchy.
 * @module core/views/folder/edges
 */

import type { IGraphData } from '../../../shared/graph/types';

/**
 * Build containment edges: folder→subfolder and folder→file.
 */
export function buildContainmentEdges(
  folderPaths: Set<string>,
  nodes: IGraphData['nodes'],
): IGraphData['edges'] {
  const edges: IGraphData['edges'] = [];

  // Folder → subfolder edges
  for (const fp of folderPaths) {
    if (fp === '(root)') continue;
    const segments = fp.split('/');
    if (segments.length > 1) {
      const parent = segments.slice(0, -1).join('/');
      edges.push({
        id: `${parent}->${fp}#codegraphy:contains`,
        from: parent,
        to: fp,
        kind: 'codegraphy:contains',
        sources: [],
      });
    }
  }

  // Folder → file edges
  for (const node of nodes) {
    const segments = node.id.split('/');
    if (segments.length === 1) {
      edges.push({
        id: `(root)->${node.id}#codegraphy:contains`,
        from: '(root)',
        to: node.id,
        kind: 'codegraphy:contains',
        sources: [],
      });
    } else {
      const parent = segments.slice(0, -1).join('/');
      edges.push({
        id: `${parent}->${node.id}#codegraphy:contains`,
        from: parent,
        to: node.id,
        kind: 'codegraphy:contains',
        sources: [],
      });
    }
  }

  return edges;
}
