/**
 * @fileoverview Folder node creation for folder view.
 * @module core/views/folderNodes
 */

import type { IGraphData } from '../../shared/types';

/**
 * Collect all unique folder paths from file node ids.
 * Returns whether root-level files exist.
 */
export function collectFolderPaths(nodes: IGraphData['nodes']): { paths: Set<string>; hasRootFiles: boolean } {
  const folderPaths = new Set<string>();

  for (const node of nodes) {
    const segments = node.id.split('/');
    for (let i = 1; i < segments.length; i++) {
      folderPaths.add(segments.slice(0, i).join('/'));
    }
  }

  const hasRootFiles = nodes.some(n => !n.id.includes('/'));
  if (hasRootFiles) {
    folderPaths.add('(root)');
  }

  return { paths: folderPaths, hasRootFiles };
}

/**
 * Create folder node objects from folder paths.
 */
export function createFolderNodes(
  folderPaths: Set<string>,
  folderNodeColor: string,
): Array<{ id: string; label: string; color: string; nodeType: 'folder' }> {
  return Array.from(folderPaths).map(fp => ({
    id: fp,
    label: fp.split('/').pop()!,
    color: folderNodeColor,
    nodeType: 'folder' as const,
  }));
}
