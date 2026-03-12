/**
 * @fileoverview View system types for CodeGraphy.
 * Views transform graph data into different visualization perspectives.
 * @module @codegraphy/plugin-api/views
 */

import type { IGraphData } from './graph';

/**
 * A view that transforms graph data into a specific visualization.
 *
 * Views can filter, transform, or reorganize the graph data to present
 * a specific perspective on the codebase (e.g., depth graph, folder view).
 *
 * @example
 * ```typescript
 * const myView: IView = {
 *   id: 'myplugin.cycleView',
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
   * Unique identifier for the view (e.g., 'codegraphy.connections').
   * Should be namespaced to avoid conflicts.
   */
  id: string;

  /**
   * Human-readable name for display in the UI.
   * @example 'Connections', 'Type Graph', 'Depth View'
   */
  name: string;

  /**
   * Codicon icon name for the view (without 'codicon-' prefix).
   * @see https://microsoft.github.io/vscode-codicons/dist/codicon.html
   * @example 'symbol-file', 'type-hierarchy', 'folder'
   */
  icon: string;

  /** Brief description of what this view shows. Used for tooltips. */
  description: string;

  /**
   * Optional plugin ID that provides this view.
   * If set, the view will only be available when the plugin is active.
   * Core views should leave this undefined.
   */
  pluginId?: string;

  /**
   * Transforms the base graph data into the view's representation.
   *
   * @param data    - The complete graph data from workspace analysis
   * @param context - Additional context for the transformation
   * @returns Transformed graph data for rendering
   */
  transform(data: IGraphData, context: IViewContext): IGraphData;

  /**
   * Optional validation to check if this view can be used.
   * Return false to hide the view (e.g., if required data is missing).
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
   * Maximum depth for depth-limited views.
   * Controls how many hops from the focused node to include.
   * Default is 1 (direct neighbors only).
   */
  depthLimit?: number;
}
