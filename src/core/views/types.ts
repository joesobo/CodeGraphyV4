/**
 * @fileoverview View system type definitions.
 * Defines the interface that all CodeGraphy views must implement.
 * Views can be core (built-in) or provided by plugins.
 * @module core/views/types
 */

import { IGraphData } from '../../shared/types';

/**
 * Represents a view type that can be displayed in CodeGraphy.
 * 
 * Views transform the base file data into different visualizations.
 * Each view can filter, transform, or reorganize the graph data
 * to present a specific perspective on the codebase.
 * 
 * @example
 * ```typescript
 * const fileDependenciesView: IView = {
 *   id: 'codegraphy.file-dependencies',
 *   name: 'File Dependencies',
 *   icon: 'symbol-file',
 *   description: 'Shows all files and their import relationships',
 *   
 *   transform(data, context) {
 *     // Return data as-is for the default view
 *     return data;
 *   }
 * };
 * ```
 */
export interface IView {
  /** 
   * Unique identifier for the view (e.g., 'codegraphy.file-dependencies').
   * Should be namespaced to avoid conflicts.
   */
  id: string;
  
  /** 
   * Human-readable name for display in the UI.
   * @example 'File Dependencies', 'Type Graph', 'Depth View'
   */
  name: string;
  
  /**
   * Codicon icon name for the view (without 'codicon-' prefix).
   * @see https://microsoft.github.io/vscode-codicons/dist/codicon.html
   * @example 'symbol-file', 'type-hierarchy', 'folder'
   */
  icon: string;
  
  /**
   * Brief description of what this view shows.
   * Used for tooltips and help text.
   */
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
   * @param data - The complete graph data from workspace analysis
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
 * Contains information about the current state of the workspace.
 */
export interface IViewContext {
  /**
   * Currently focused file path (relative to workspace).
   * Used by views like Depth Graph that center on a specific file.
   */
  focusedFile?: string;
  
  /**
   * Currently selected folder path (relative to workspace).
   * Used by views like Subfolder View that limit scope.
   */
  selectedFolder?: string;
  
  /**
   * Set of active plugin IDs.
   * Used to determine which plugin-provided views are available.
   */
  activePlugins: Set<string>;
  
  /**
   * Workspace root path (absolute).
   */
  workspaceRoot?: string;
  
  /**
   * Maximum depth for depth-limited views (e.g., Depth Graph).
   * Controls how many hops from the focused node to include.
   * Default is 1 (direct neighbors only).
   */
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
