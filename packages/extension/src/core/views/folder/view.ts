/**
 * @fileoverview Folder View — shows the folder containment hierarchy.
 * @module core/views/folder/view
 */

import { IView, IViewContext } from '../contracts';
import { DEFAULT_FOLDER_NODE_COLOR } from '../../../shared/fileColors';
import type { IGraphData } from '../../../shared/graph/types';
import { collectFolderPaths, createFolderNodes } from './nodes';
import { buildContainmentEdges } from './edges';

export const folderView: IView = {
  id: 'codegraphy.folder',
  name: 'Folder',
  icon: 'folder',
  description: 'Shows the folder containment hierarchy',

  transform(data: IGraphData, context: IViewContext): IGraphData {
    const { paths: folderPaths } = collectFolderPaths(data.nodes);
    const folderNodeColor = context.folderNodeColor ?? DEFAULT_FOLDER_NODE_COLOR;
    const folderNodes = createFolderNodes(folderPaths, folderNodeColor);
    const fileNodes = data.nodes.map(n => ({ ...n, nodeType: 'file' as const }));
    const edges = buildContainmentEdges(folderPaths, data.nodes);

    return {
      nodes: [...folderNodes, ...fileNodes],
      edges,
    };
  },
};
