/**
 * @fileoverview Shared types between the VSCode extension and webview.
 * These types define the data structures for file analysis, graph rendering,
 * and the message protocol for communication between extension and webview.
 * @module shared/types
 */

// ============================================================================
// Settings Types
// ============================================================================

/**
 * Node size calculation mode.
 * Determines how node sizes are computed in the graph.
 */
export type NodeSizeMode = 'connections' | 'file-size' | 'access-count' | 'uniform';

// ============================================================================
// File Data (internal representation, what plugins will produce)
// ============================================================================

/**
 * Represents a file in the codebase with its import relationships.
 * This is the internal representation used by plugins to report file connections.
 * 
 * @example
 * ```typescript
 * const file: IFileData = {
 *   path: 'src/components/Button.tsx',
 *   name: 'Button.tsx',
 *   extension: '.tsx',
 *   imports: ['src/styles/button.css', 'src/utils/helpers.ts']
 * };
 * ```
 */
export interface IFileData {
  /** 
   * Full file path relative to workspace root.
   * Acts as the unique identifier for this file.
   * @example 'src/components/Button.tsx'
   */
  path: string;
  
  /** 
   * Filename without path, used for display labels.
   * @example 'Button.tsx'
   */
  name: string;
  
  /** 
   * File extension including the leading dot.
   * Used for determining file type colors.
   * @example '.tsx'
   */
  extension: string;
  
  /** 
   * Array of file paths that this file imports.
   * Paths should be resolved to workspace-relative paths.
   * @example ['src/utils/helpers.ts', 'src/styles/global.css']
   */
  imports: string[];
}

// ============================================================================
// Graph Data (for Vis Network rendering)
// ============================================================================

/**
 * Represents a node in the dependency graph.
 * Each node corresponds to a file in the codebase.
 * 
 * @example
 * ```typescript
 * const node: IGraphNode = {
 *   id: 'src/App.tsx',
 *   label: 'App.tsx',
 *   color: '#67E8F9',
 *   x: 150,
 *   y: 200
 * };
 * ```
 */
export interface IGraphNode {
  /** 
   * Unique identifier for the node.
   * Typically the file path relative to workspace root.
   * @example 'src/components/Button.tsx'
   */
  id: string;
  
  /** 
   * Display label shown on the graph.
   * Typically the filename without path.
   * @example 'Button.tsx'
   */
  label: string;
  
  /** 
   * Fill color for the node (hex string).
   * Derived from file extension using {@link getFileColor}.
   * @example '#67E8F9'
   */
  color: string;
  
  /** 
   * Persisted X position from previous session.
   * If undefined, physics will determine initial position.
   */
  x?: number;
  
  /**
   * Whether this node is marked as a favorite.
   * Favorited nodes display with a yellow outline.
   */
  favorite?: boolean;
  
  /** 
   * Persisted Y position from previous session.
   * If undefined, physics will determine initial position.
   */
  y?: number;
  
  /**
   * File size in bytes.
   * Used for 'file-size' node sizing mode.
   */
  fileSize?: number;
  
  /**
   * Number of times this file has been opened.
   * Used for 'access-count' node sizing mode.
   */
  accessCount?: number;
}

/**
 * Represents a directed edge (connection) between two nodes.
 * Edges represent import relationships where the source file imports the target.
 * 
 * @example
 * ```typescript
 * const edge: IGraphEdge = {
 *   id: 'src/App.tsx->src/Button.tsx',
 *   from: 'src/App.tsx',
 *   to: 'src/Button.tsx'
 * };
 * ```
 */
export interface IGraphEdge {
  /** 
   * Unique edge identifier.
   * Format: "fromPath->toPath"
   * @example 'src/App.tsx->src/Button.tsx'
   */
  id: string;
  
  /** 
   * Source node ID (the importing file).
   * @example 'src/App.tsx'
   */
  from: string;
  
  /** 
   * Target node ID (the imported file).
   * @example 'src/Button.tsx'
   */
  to: string;
}

/**
 * Complete graph data structure for Vis Network rendering.
 * Contains all nodes and edges to display.
 * 
 * @example
 * ```typescript
 * const graphData: IGraphData = {
 *   nodes: [
 *     { id: 'a.ts', label: 'a.ts', color: '#93C5FD' },
 *     { id: 'b.ts', label: 'b.ts', color: '#93C5FD' }
 *   ],
 *   edges: [
 *     { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' }
 *   ]
 * };
 * ```
 */
export interface IGraphData {
  /** Array of all nodes (files) in the graph */
  nodes: IGraphNode[];
  /** Array of all edges (imports) in the graph */
  edges: IGraphEdge[];
  /** Node sizing mode setting */
  nodeSizeMode?: NodeSizeMode;
}

// ============================================================================
// Message Protocol (Extension <-> Webview)
// ============================================================================

/**
 * Messages sent from the Extension to the Webview.
 * Used to update the graph display.
 * 
 * @example
 * ```typescript
 * // Send updated graph data to webview
 * const message: ExtensionToWebviewMessage = {
 *   type: 'GRAPH_DATA_UPDATED',
 *   payload: graphData
 * };
 * webview.postMessage(message);
 * ```
 */
/** Bidirectional edge display mode */
export type BidirectionalEdgeMode = 'separate' | 'combined';

/**
 * View information sent to the webview for the view switcher.
 */
export interface IAvailableView {
  /** Unique view identifier */
  id: string;
  /** Display name */
  name: string;
  /** Codicon icon name */
  icon: string;
  /** Description for tooltip */
  description: string;
  /** Whether this is the currently active view */
  active: boolean;
}

/**
 * Physics settings for the graph simulation.
 */
export interface IPhysicsSettings {
  /** Gravity strength - how strongly nodes pull toward center (negative values) */
  gravitationalConstant: number;
  /** Preferred distance between connected nodes */
  springLength: number;
  /** Spring stiffness - how strongly connected nodes pull together */
  springConstant: number;
  /** How quickly motion settles (0-1) */
  damping: number;
  /** Pull toward the center of the viewport (0-1) */
  centralGravity: number;
}

export type ExtensionToWebviewMessage =
  | { type: 'GRAPH_DATA_UPDATED'; payload: IGraphData }
  | { type: 'FIT_VIEW' }
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_OUT' }
  | { type: 'FAVORITES_UPDATED'; payload: { favorites: string[] } }
  | { type: 'THEME_CHANGED'; payload: { kind: 'light' | 'dark' | 'high-contrast' } }
  | { type: 'FILE_INFO'; payload: IFileInfo }
  | { type: 'SETTINGS_UPDATED'; payload: { bidirectionalEdges: BidirectionalEdgeMode } }
  | { type: 'REQUEST_EXPORT_PNG' }
  | { type: 'REQUEST_EXPORT_SVG' }
  | { type: 'REQUEST_EXPORT_JSON' }
  | { type: 'NODE_ACCESS_COUNT_UPDATED'; payload: { nodeId: string; accessCount: number } }
  | { type: 'VIEWS_UPDATED'; payload: { views: IAvailableView[]; activeViewId: string } }
  | { type: 'PHYSICS_SETTINGS_UPDATED'; payload: IPhysicsSettings };

/**
 * Messages sent from the Webview to the Extension.
 * Used for user interactions and state synchronization.
 * 
 * Message types:
 * - `WEBVIEW_READY` - Webview has loaded and is ready for data
 * - `NODE_SELECTED` - User clicked on a node
 * - `NODE_DOUBLE_CLICKED` - User double-clicked to open file
 * - `POSITIONS_UPDATED` - Bulk position update (after physics stabilization)
 * 
 * @example
 * ```typescript
 * // Notify extension that a file should be opened
 * const message: WebviewToExtensionMessage = {
 *   type: 'NODE_DOUBLE_CLICKED',
 *   payload: { nodeId: 'src/App.tsx' }
 * };
 * vscode.postMessage(message);
 * ```
 */
export type WebviewToExtensionMessage =
  | { type: 'NODE_SELECTED'; payload: { nodeId: string } }
  | { type: 'NODE_DOUBLE_CLICKED'; payload: { nodeId: string } }
  | { type: 'POSITIONS_UPDATED'; payload: { positions: Record<string, { x: number; y: number }> } }
  | { type: 'WEBVIEW_READY'; payload: null }
  // Context menu actions
  | { type: 'OPEN_FILE'; payload: { path: string } }
  | { type: 'REVEAL_IN_EXPLORER'; payload: { path: string } }
  | { type: 'COPY_TO_CLIPBOARD'; payload: { text: string } }
  | { type: 'DELETE_FILES'; payload: { paths: string[] } }
  | { type: 'RENAME_FILE'; payload: { path: string } }
  | { type: 'CREATE_FILE'; payload: { directory: string } }
  | { type: 'TOGGLE_FAVORITE'; payload: { paths: string[] } }
  | { type: 'ADD_TO_EXCLUDE'; payload: { patterns: string[] } }
  | { type: 'REFRESH_GRAPH' }
  | { type: 'GET_FILE_INFO'; payload: { path: string } }
  | { type: 'EXPORT_PNG'; payload: { dataUrl: string; filename?: string } }
  | { type: 'EXPORT_SVG'; payload: { svg: string; filename?: string } }
  | { type: 'EXPORT_JSON'; payload: { json: string; filename?: string } }
  | { type: 'UPDATE_PHYSICS_SETTING'; payload: { key: keyof IPhysicsSettings; value: number } }
  | { type: 'RESET_PHYSICS_SETTINGS' }
  | { type: 'GET_PHYSICS_SETTINGS' }
  // Undo/Redo commands from webview keyboard shortcuts
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // View switching
  | { type: 'CHANGE_VIEW'; payload: { viewId: string } };

/**
 * File information returned from extension for tooltips.
 */
export interface IFileInfo {
  /** File path relative to workspace */
  path: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp (ms since epoch) */
  lastModified: number;
  /** Plugin that handles this file type */
  plugin?: string;
  /** Number of incoming connections (files that import this) */
  incomingCount: number;
  /** Number of outgoing connections (files this imports) */
  outgoingCount: number;
  /** Number of times this file has been viewed/selected */
  visits: number;
}

// ============================================================================
// File Type Colors
// ============================================================================

/**
 * Legacy static color palette for file extensions.
 * 
 * @deprecated Use {@link ColorPaletteManager} for dynamic color generation.
 * This is kept for backwards compatibility with tests and mock data.
 * The extension now uses ColorPaletteManager which:
 * - Generates distinct colors for any number of file types
 * - Allows plugins to define preferred colors
 * - Allows users to override colors via settings
 * 
 * @see {@link ColorPaletteManager} for the new dynamic color system
 */
export const FILE_TYPE_COLORS: Record<string, string> = {
  '.ts': '#93C5FD',    // Soft blue
  '.tsx': '#67E8F9',   // Soft cyan
  '.js': '#FDE68A',    // Soft yellow
  '.jsx': '#FDBA74',   // Soft peach
  '.css': '#F9A8D4',   // Soft pink
  '.scss': '#E879F9',  // Soft magenta
  '.json': '#86EFAC',  // Soft green
  '.md': '#CBD5E1',    // Soft gray
  '.html': '#FCA5A5',  // Soft coral
  '.svg': '#C4B5FD',   // Soft purple
};

/**
 * Default color for file types not in {@link FILE_TYPE_COLORS}.
 * A neutral soft zinc gray that works on dark backgrounds.
 */
export const DEFAULT_NODE_COLOR = '#A1A1AA'; // Soft zinc

/**
 * Get the display color for a file based on its extension.
 * 
 * @param extension - File extension including leading dot (e.g., '.ts')
 * @returns Hex color string for the file type
 * 
 * @example
 * ```typescript
 * getFileColor('.ts')   // Returns '#93C5FD' (soft blue)
 * getFileColor('.tsx')  // Returns '#67E8F9' (soft cyan)
 * getFileColor('.xyz')  // Returns '#A1A1AA' (default gray)
 * ```
 */
export function getFileColor(extension: string): string {
  return FILE_TYPE_COLORS[extension.toLowerCase()] ?? DEFAULT_NODE_COLOR;
}
