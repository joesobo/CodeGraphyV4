/**
 * @fileoverview Extension-local view registry contracts.
 * @module core/views/contracts
 */

import type { IGraphData } from '../../shared/graph/contracts';

export type ViewDependency =
  | 'focusedFile'
  | 'depthLimit';

export interface IView {
  id: string;
  name: string;
  icon: string;
  description: string;
  pluginId?: string;
  recomputeOn?: readonly ViewDependency[];
  transform(data: IGraphData, context: IViewContext): IGraphData;
  isAvailable?(context: IViewContext): boolean;
}

export interface IViewContext {
  focusedFile?: string;
  activePlugins: Set<string>;
  workspaceRoot?: string;
  depthLimit?: number;
}

/**
 * Information about a registered view.
 */
export interface IViewInfo {
  /** The view instance */
  view: IView;
  /** Whether this is a core (built-in) view */
  core: boolean;
  /** Registration order (lower = registered earlier) */
  order: number;
}

/**
 * View change event payload.
 */
export interface IViewChangeEvent {
  /** Previous view ID (undefined if first selection) */
  previousViewId?: string;
  /** New view ID */
  newViewId: string;
}
