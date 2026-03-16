/**
 * @fileoverview Core views that ship with CodeGraphy.
 * These views are always available regardless of which plugins are active.
 * @module core/views/builtIn
 */

import { IView } from './types';

export { depthGraphView } from './depthGraph';
export { folderView } from './folderView';

import { depthGraphView } from './depthGraph';
import { folderView } from './folderView';

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
