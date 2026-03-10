/**
 * @fileoverview View system exports.
 * @module core/views
 */

export { ViewRegistry } from './ViewRegistry';
export { 
  connectionsView, 
  depthGraphView, 
  subfolderView, 
  coreViews 
} from './coreViews';
export type { 
  IView, 
  IViewInfo, 
  IViewContext, 
  IViewChangeEvent 
} from './types';
