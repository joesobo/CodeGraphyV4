/**
 * @fileoverview View system exports.
 * @module core/views
 */

export { ViewRegistry } from './viewRegistry';
export {
  connectionsView,
  depthGraphView,
  folderView,
  coreViews
} from './coreViews';
export type { 
  IView, 
  IViewInfo, 
  IViewContext, 
  IViewChangeEvent 
} from './types';
