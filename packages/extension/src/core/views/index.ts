/**
 * @fileoverview View system exports.
 * @module core/views
 */

export { ViewRegistry } from './registry';
export {
  connectionsView,
  depthGraphView,
  folderView,
  coreViews
} from './builtIn';
export type { 
  IView, 
  IViewInfo, 
  IViewContext, 
  IViewChangeEvent 
} from './types';
