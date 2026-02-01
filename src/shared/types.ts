/**
 * @fileoverview Shared types between the VSCode extension and webview.
 * These types define the data structures for file analysis, graph rendering,
 * and the message protocol for communication between extension and webview.
 * @module shared/types
 */

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
   * Persisted Y position from previous session.
   * If undefined, physics will determine initial position.
   */
  y?: number;
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
export type ExtensionToWebviewMessage =
  | { type: 'GRAPH_DATA_UPDATED'; payload: IGraphData }
  | { type: 'FIT_VIEW' }
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_OUT' };

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
  | { type: 'WEBVIEW_READY'; payload: null };

// ============================================================================
// File Type Colors
// ============================================================================

/**
 * Pastel color palette mapping file extensions to hex colors.
 * These colors are optimized for visibility on dark backgrounds.
 * 
 * Supported extensions:
 * - `.ts` - Soft blue (#93C5FD)
 * - `.tsx` - Soft cyan (#67E8F9)
 * - `.js` - Soft yellow (#FDE68A)
 * - `.jsx` - Soft peach (#FDBA74)
 * - `.css` - Soft pink (#F9A8D4)
 * - `.scss` - Soft magenta (#E879F9)
 * - `.json` - Soft green (#86EFAC)
 * - `.md` - Soft gray (#CBD5E1)
 * - `.html` - Soft coral (#FCA5A5)
 * - `.svg` - Soft purple (#C4B5FD)
 * 
 * @see {@link getFileColor} for retrieving colors
 * @see {@link DEFAULT_NODE_COLOR} for unsupported extensions
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
