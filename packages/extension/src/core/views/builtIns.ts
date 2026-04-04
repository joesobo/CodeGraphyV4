/**
 * @fileoverview Core views that ship with CodeGraphy.
 * These views are always available regardless of which plugins are active.
 * @module core/views/builtIns
 */

import { IView } from './contracts';

export { depthGraphView } from './depth/view';
export { folderView } from './folder/view';

import { depthGraphView } from './depth/view';
import { folderView } from './folder/view';

/**
 * Connections view - the default view.
 * Shows all files and their import relationships.
 * This is the current default behavior of CodeGraphy.
 */
export const connectionsView: IView = {
  id: 'codegraphy.connections',
  name: 'Connections',
  icon: 'symbol-file',
  description: 'Shows all files and their import relationships',

  transform(data, _context) {
    // Pass through - this is the default view that shows everything
    return data;
  },
};

/**
 * All core views that ship with CodeGraphy.
 * Register these on startup.
 */
export const coreViews: IView[] = [
  connectionsView,
  depthGraphView,
  folderView,
];
