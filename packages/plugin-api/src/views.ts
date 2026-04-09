/**
 * @fileoverview View system types for CodeGraphy.
 * Views are plugin-defined graph transforms the host may expose as optional
 * alternate surfaces on top of the unified graph experience.
 * @module @codegraphy-vscode/plugin-api/views
 */

import type { IGraphData } from './graph';

export type ViewDependency =
  | 'focusedFile'
  | 'depthLimit';

/**
 * A plugin-defined graph transform.
 *
 * Views can filter, transform, or reorganize the graph data to present
 * a specific perspective on the codebase when the host chooses to surface it.
 *
 * @example
 * ```typescript
 * const myView: IView = {
 *   id: 'myplugin.cycles',
 *   name: 'Cycles',
 *   icon: 'sync',
 *   description: 'Highlights circular dependencies',
 *   transform(data, context) {
 *     // Filter to only cyclic nodes/edges
 *     return filterToCycles(data);
 *   }
 * };
 * ```
 */
export interface IView {
  /**
   * Unique identifier for the view.
   * Should be namespaced to avoid conflicts.
   */
  id: string;

  /**
   * Human-readable name for display in the UI.
   * @example 'Cycle Lens', 'API Surface', 'Hotspots'
   */
  name: string;

  /**
   * Codicon icon name for the view (without 'codicon-' prefix).
   * @see https://microsoft.github.io/vscode-codicons/dist/codicon.html
   * @example 'symbol-file', 'type-hierarchy', 'folder'
   */
  icon: string;

  /** Brief description of what this transform shows. Used for tooltips. */
  description: string;

  /**
   * Optional plugin ID that provides this view.
   * If set, the view will only be available when the plugin is active.
   * Host-defined views should leave this undefined.
   */
  pluginId?: string;

  /**
   * Declares which context changes should re-run this transform
   * while it is active.
   */
  recomputeOn?: readonly ViewDependency[];

  /**
   * Transforms the base graph data into the view's representation.
   *
   * @param data    - The complete graph data from workspace analysis
   * @param context - Additional context for the transformation
   * @returns Transformed graph data for rendering
   */
  transform(data: IGraphData, context: IViewContext): IGraphData;

  /**
   * Optional validation to check if this transform can be used.
   * Return false to hide it when the required data is missing.
   *
   * @param context - Context to validate against
   * @returns true if the view can be displayed
   */
  isAvailable?(context: IViewContext): boolean;
}

/**
 * Context provided to view transformations.
 */
export interface IViewContext {
  /** Currently focused file path (relative to workspace). */
  focusedFile?: string;

  /** Set of active plugin IDs. */
  activePlugins: Set<string>;

  /** Workspace root path (absolute). */
  workspaceRoot?: string;

  /**
   * Maximum depth for depth-aware transforms.
   * Controls how many hops from the focused node to include.
   * Default is 1 (direct neighbors only).
   */
  depthLimit?: number;

}
