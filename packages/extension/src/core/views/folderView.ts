/**
 * @fileoverview Folder View for CodeGraphy.
 * Shows the folder containment hierarchy instead of import connections.
 * @module core/views/folderView
 */

import { IView, IViewContext } from './types';
import { IGraphData, DEFAULT_FOLDER_NODE_COLOR } from '../../shared/types';

/**
 * Folder View — shows the folder containment hierarchy.
 * Replaces import edges with parent→child containment edges,
 * creating folder nodes for every directory level.
 *
 * Root-level files (no `/` in id) get a synthetic `(root)` folder parent.
 */
export const folderView: IView = {
  id: 'codegraphy.folder',
  name: 'Folder',
  icon: 'folder',
  description: 'Shows the folder containment hierarchy',

  transform(data: IGraphData, context: IViewContext): IGraphData {
    if (data.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Collect all unique folder paths from file node ids
    const folderPaths = new Set<string>();

    for (const node of data.nodes) {
      const segments = node.id.split('/');
      // Build every ancestor path: a, a/b, a/b/c, ...
      if (segments.length > 1) {
        for (let i = 1; i < segments.length; i++) {
          folderPaths.add(segments.slice(0, i).join('/'));
        }
      }
      // Root-level files (no `/`) will be handled below
    }

    // Determine whether we need a (root) synthetic folder
    const hasRootFiles = data.nodes.some(n => !n.id.includes('/'));
    if (hasRootFiles) {
      folderPaths.add('(root)');
    }

    // Create folder nodes
    const folderNodes = Array.from(folderPaths).map(fp => ({
      id: fp,
      label: fp === '(root)' ? '(root)' : fp.split('/').pop()!,
      color: context.folderNodeColor ?? DEFAULT_FOLDER_NODE_COLOR,
      nodeType: 'folder' as const,
    }));

    // Annotate file nodes with nodeType: 'file', preserving all original properties
    const fileNodes = data.nodes.map(n => ({
      ...n,
      nodeType: 'file' as const,
    }));

    // Build containment edges
    const edges: IGraphData['edges'] = [];

    // Folder → subfolder edges
    for (const fp of folderPaths) {
      if (fp === '(root)') continue;
      const segments = fp.split('/');
      if (segments.length === 1) {
        // top-level folder has no parent folder (unless we wanted (root)→folder, but spec says root is only for root-level files)
      } else {
        const parent = segments.slice(0, -1).join('/');
        edges.push({ id: `${parent}->${fp}`, from: parent, to: fp });
      }
    }

    // Folder → file edges
    for (const node of data.nodes) {
      const segments = node.id.split('/');
      if (segments.length === 1) {
        // Root-level file → parent is (root)
        edges.push({ id: `(root)->${node.id}`, from: '(root)', to: node.id });
      } else {
        const parent = segments.slice(0, -1).join('/');
        edges.push({ id: `${parent}->${node.id}`, from: parent, to: node.id });
      }
    }

    return {
      nodes: [...folderNodes, ...fileNodes],
      edges,
    };
  },
};
