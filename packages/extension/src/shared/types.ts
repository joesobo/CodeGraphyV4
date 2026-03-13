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

/**
 * Available 2D canvas node shapes.
 */
export type NodeShape2D = 'circle' | 'square' | 'diamond' | 'triangle' | 'hexagon' | 'star';

/**
 * Available 3D WebGL node shapes.
 */
export type NodeShape3D = 'sphere' | 'cube' | 'octahedron' | 'cone' | 'dodecahedron' | 'icosahedron';

/**
 * Direction indicator mode for graph edges.
 * Determines how import direction is visualized on connections.
 */
export type DirectionMode = 'arrows' | 'particles' | 'none';

/**
 * DAG (Directed Acyclic Graph) layout mode.
 * Controls hierarchical layout of the force graph.
 * `null` means free-form physics layout (default).
 */
export type DagMode = null | 'radialout' | 'td' | 'lr';

/**
 * Node type for folder view.
 * 'file' = a source file, 'folder' = a directory container.
 */
export type NodeType = 'file' | 'folder';

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
  
  /**
   * Distance from the focused node in the depth graph view.
   * 0 = the focused node, 1 = direct neighbors, 2 = two hops away, etc.
   * Used for visual styling (opacity, size) in depth graph view.
   */
  depthLevel?: number;

  /**
   * Node type for folder view.
   * 'file' = a source file, 'folder' = a directory container.
   */
  nodeType?: NodeType;

  /** 2D canvas shape from group matching */
  shape2D?: NodeShape2D;
  /** 3D WebGL shape from group matching */
  shape3D?: NodeShape3D;
  /** Webview URI for overlay image from group matching */
  imageUrl?: string;
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

  /**
   * The rule that detected this connection (e.g., 'es6-import').
   * Used for filtering by disabled rules in timeline mode.
   * Only present on edges produced by the timeline cache.
   */
  ruleId?: string;

  /**
   * All qualified rule IDs that detected this connection.
   * Format: "pluginId:ruleId" (e.g., 'codegraphy.typescript:es6-import').
   * Present when the source plugin can be identified (normal analysis and timeline analysis).
   */
  ruleIds?: string[];
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
// Timeline Types
// ============================================================================

/**
 * Information about a single git commit for the timeline feature.
 */
export interface ICommitInfo {
  /** Full 40-character SHA */
  sha: string;
  /** Unix timestamp in seconds */
  timestamp: number;
  /** First line of the commit message */
  message: string;
  /** Author name */
  author: string;
  /** Parent commit SHAs */
  parents: string[];
}

/**
 * Timeline data sent to the webview after indexing.
 */
export interface ITimelineData {
  /** Commits ordered oldest-first */
  commits: ICommitInfo[];
  /** SHA of the currently displayed commit */
  currentSha: string;
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
  /** Node repulsion strength (0 = no repel, 20 = max repel). Mapped to d3 forceManyBody. */
  repelForce: number;
  /** Preferred distance between connected nodes in pixels (30–500). */
  linkDistance: number;
  /** Spring stiffness — how strongly connected nodes pull together (0–1). */
  linkForce: number;
  /** How quickly motion settles (0–1). Higher = less jitter after drag. */
  damping: number;
  /** Pull toward the viewport center (0 = none, 1 = max). */
  centerForce: number;
}


/**
 * Complete snapshot of all user-configurable settings.
 * Used by ResetSettingsAction for state-based undo/redo.
 */
export interface ISettingsSnapshot {
  physics: IPhysicsSettings;
  groups: IGroup[];
  filterPatterns: string[];
  showOrphans: boolean;
  bidirectionalMode: BidirectionalEdgeMode;
  directionMode: DirectionMode;
  directionColor: string;
  folderNodeColor: string;
  particleSpeed: number;
  particleSize: number;
  showLabels: boolean;
  nodeSizeMode: NodeSizeMode;
  maxFiles: number;
  hiddenPluginGroups: string[];
}

/**
 * A user-defined color group — matches files by glob pattern and assigns a color.
 */
export interface IGroup {
  /** Unique identifier (crypto.randomUUID()) */
  id: string;
  /** Glob pattern, e.g. "src/**", "*.test.ts" */
  pattern: string;
  /** Hex color string, e.g. "#3B82F6" */
  color: string;
  /** 2D canvas shape (defaults to 'circle') */
  shape2D?: NodeShape2D;
  /** 3D WebGL shape (defaults to 'sphere') */
  shape3D?: NodeShape3D;
  /** Workspace-relative path to image for persistence */
  imagePath?: string;
  /** Webview URI for the image (resolved at send-time, not persisted) */
  imageUrl?: string;
  /** True for plugin-provided default groups (read-only in UI) */
  isPluginDefault?: boolean;
  /** Display name of the plugin that provided this group (set at send-time) */
  pluginName?: string;
  /** When true, group is visible in settings but not applied to nodes */
  disabled?: boolean;
}
// ============================================================================
// Plugin Decoration Payload Types (for webview rendering)
// ============================================================================

/**
 * Serializable node decoration payload sent to the webview.
 * Mirrors NodeDecoration from DecorationManager.
 */
export interface NodeDecorationPayload {
  badge?: {
    text: string;
    color?: string;
    bgColor?: string;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    tooltip?: string;
  };
  border?: {
    color: string;
    width?: number;
    style?: 'solid' | 'dashed' | 'dotted';
  };
  tooltip?: {
    sections: Array<{ title: string; content: string }>;
  };
  label?: {
    text?: string;
    sublabel?: string;
    color?: string;
  };
  size?: {
    scale?: number;
  };
  opacity?: number;
  color?: string;
  icon?: string;
  group?: string;
}

/**
 * Serializable edge decoration payload sent to the webview.
 * Mirrors EdgeDecoration from DecorationManager.
 */
export interface EdgeDecorationPayload {
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  label?: { text: string; color?: string };
  particles?: { count?: number; color?: string; speed?: number };
  opacity?: number;
  curvature?: number;
}

/**
 * Context menu item registered by a plugin, sent to the webview.
 */
export interface IPluginContextMenuItem {
  label: string;
  when: 'node' | 'edge' | 'both';
  icon?: string;
  group?: string;
  pluginId: string;
  index: number;
}

// ============================================================================
// Plugin Status Types (for Plugins Panel)
// ============================================================================

/**
 * Status of an individual plugin rule as seen by the webview.
 */
export interface IPluginRuleStatus {
  /** Rule ID within the plugin */
  id: string;
  /** Qualified ID: "pluginId:ruleId" */
  qualifiedId: string;
  /** Human-readable name */
  name: string;
  /** Short description */
  description: string;
  /** Whether this rule is enabled */
  enabled: boolean;
  /** Number of connections detected by this rule */
  connectionCount: number;
}

/**
 * Status of a plugin as seen by the webview.
 */
export interface IPluginStatus {
  /** Plugin ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Plugin version */
  version: string;
  /** File extensions this plugin handles */
  supportedExtensions: string[];
  /** Current status */
  status: 'active' | 'installed' | 'inactive';
  /** Whether the entire plugin is enabled */
  enabled: boolean;
  /** Total connection count */
  connectionCount: number;
  /** Per-rule statuses */
  rules: IPluginRuleStatus[];
}

export type ExtensionToWebviewMessage =
  | { type: 'GRAPH_DATA_UPDATED'; payload: IGraphData }
  | { type: 'FIT_VIEW' }
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_OUT' }
  | { type: 'FAVORITES_UPDATED'; payload: { favorites: string[] } }
  | { type: 'THEME_CHANGED'; payload: { kind: 'light' | 'dark' | 'high-contrast' } }
  | { type: 'FILE_INFO'; payload: IFileInfo }
  | { type: 'SETTINGS_UPDATED'; payload: { bidirectionalEdges: BidirectionalEdgeMode; showOrphans: boolean } }
  // Export requests (extension → webview, triggers export in Graph.tsx)
  | { type: 'REQUEST_EXPORT_PNG' }
  | { type: 'REQUEST_EXPORT_SVG' }
  | { type: 'REQUEST_EXPORT_JPEG' }
  | { type: 'REQUEST_EXPORT_JSON' }
  | { type: 'REQUEST_EXPORT_MD' }
  | { type: 'NODE_ACCESS_COUNT_UPDATED'; payload: { nodeId: string; accessCount: number } }
  | { type: 'VIEWS_UPDATED'; payload: { views: IAvailableView[]; activeViewId: string } }
  | { type: 'PHYSICS_SETTINGS_UPDATED'; payload: IPhysicsSettings }
  | { type: 'DEPTH_LIMIT_UPDATED'; payload: { depthLimit: number } }
  | { type: 'GROUPS_UPDATED'; payload: { groups: IGroup[] } }
  | { type: 'FILTER_PATTERNS_UPDATED'; payload: { patterns: string[]; pluginPatterns: string[] } }
  | { type: 'DIRECTION_SETTINGS_UPDATED'; payload: { directionMode: DirectionMode; particleSpeed: number; particleSize: number; directionColor: string } }
  | { type: 'SHOW_LABELS_UPDATED'; payload: { showLabels: boolean } }
  | { type: 'PLUGINS_UPDATED'; payload: { plugins: IPluginStatus[] } }
  | { type: 'MAX_FILES_UPDATED'; payload: { maxFiles: number } }
  // Timeline messages
  | { type: 'INDEX_PROGRESS'; payload: { phase: string; current: number; total: number } }
  | { type: 'TIMELINE_DATA'; payload: ITimelineData }
  | { type: 'COMMIT_GRAPH_DATA'; payload: { sha: string; graphData: IGraphData } }
  | { type: 'PLAYBACK_SPEED_UPDATED'; payload: { speed: number } }
  | { type: 'CACHE_INVALIDATED' }
  | { type: 'PLAYBACK_ENDED' }
  // Test/debug: request node positions + sizes for overlap detection
  | { type: 'GET_NODE_BOUNDS' }
  // Plugin API v2 messages
  | { type: 'DECORATIONS_UPDATED'; payload: { nodeDecorations: Record<string, NodeDecorationPayload>; edgeDecorations: Record<string, EdgeDecorationPayload> } }
  | { type: 'CONTEXT_MENU_ITEMS'; payload: { items: IPluginContextMenuItem[] } }
  | { type: 'PLUGIN_WEBVIEW_INJECT'; payload: { pluginId: string; scripts: string[]; styles: string[] } }
  | { type: 'FOLDER_NODE_COLOR_UPDATED'; payload: { folderNodeColor: string } }
  | { type: 'DAG_MODE_UPDATED'; payload: { dagMode: DagMode } }
  | { type: 'NODE_SIZE_MODE_UPDATED'; payload: { nodeSizeMode: NodeSizeMode } }
  // Toolbar keyboard shortcuts
  | { type: 'CYCLE_VIEW' }
  | { type: 'CYCLE_LAYOUT' }
  | { type: 'TOGGLE_DIMENSION' };

/**
 * Messages sent from the Webview to the Extension.
 * Used for user interactions and state synchronization.
 * 
 * Message types:
 * - `WEBVIEW_READY` - Webview has loaded and is ready for data
 * - `NODE_SELECTED` - User clicked on a node
 * - `NODE_DOUBLE_CLICKED` - Open/preview request for node activation (double-click or Enter)
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
  // Export results (webview → extension, carries export data for save dialog)
  | { type: 'EXPORT_PNG'; payload: { dataUrl: string; filename?: string } }
  | { type: 'EXPORT_SVG'; payload: { svg: string; filename?: string } }
  | { type: 'EXPORT_JPEG'; payload: { dataUrl: string; filename?: string } }
  | { type: 'EXPORT_JSON'; payload: { json: string; filename?: string } }
  | { type: 'EXPORT_MD'; payload: { markdown: string; filename?: string } }
  | { type: 'UPDATE_PHYSICS_SETTING'; payload: { key: keyof IPhysicsSettings; value: number } }
  | { type: 'RESET_PHYSICS_SETTINGS' }
  | { type: 'RESET_ALL_SETTINGS' }
  | { type: 'GET_PHYSICS_SETTINGS' }
  // Undo/Redo commands from webview keyboard shortcuts
  | { type: 'UNDO' }
  | { type: 'REDO' }
  // View switching
  | { type: 'CHANGE_VIEW'; payload: { viewId: string } }
  // Depth graph settings
  | { type: 'CHANGE_DEPTH_LIMIT'; payload: { depthLimit: number } }
  // Settings panel
  | { type: 'UPDATE_GROUPS'; payload: { groups: IGroup[] } }
  | { type: 'UPDATE_FILTER_PATTERNS'; payload: { patterns: string[] } }
  | { type: 'UPDATE_SHOW_ORPHANS'; payload: { showOrphans: boolean } }
  | { type: 'UPDATE_BIDIRECTIONAL_MODE'; payload: { bidirectionalMode: BidirectionalEdgeMode } }
  | { type: 'UPDATE_DIRECTION_MODE'; payload: { directionMode: DirectionMode } }
  | { type: 'UPDATE_DIRECTION_COLOR'; payload: { directionColor: string } }
  | { type: 'UPDATE_PARTICLE_SETTING'; payload: { key: 'particleSpeed' | 'particleSize'; value: number } }
  | { type: 'UPDATE_SHOW_LABELS'; payload: { showLabels: boolean } }
  // Physics lifecycle — sent when physics disables after stabilization
  | { type: 'PHYSICS_STABILIZED' }
  // Plugin toggles
  | { type: 'TOGGLE_RULE'; payload: { qualifiedId: string; enabled: boolean } }
  | { type: 'TOGGLE_PLUGIN'; payload: { pluginId: string; enabled: boolean } }
  | { type: 'UPDATE_MAX_FILES'; payload: { maxFiles: number } }
  // Timeline commands
  | { type: 'INDEX_REPO' }
  | { type: 'JUMP_TO_COMMIT'; payload: { sha: string } }
  | { type: 'PREVIEW_FILE_AT_COMMIT'; payload: { sha: string; filePath: string } }
  // Response to GET_NODE_BOUNDS: positions + radii for all nodes
  | { type: 'NODE_BOUNDS_RESPONSE'; payload: { nodes: Array<{ id: string; x: number; y: number; size: number }> } }
  // Plugin API v2: forward graph interactions to extension EventBus
  | { type: 'GRAPH_INTERACTION'; payload: { event: string; data: unknown } }
  // Plugin API v2: invoke a plugin context menu action
  | { type: 'PLUGIN_CONTEXT_MENU_ACTION'; payload: { pluginId: string; index: number; targetId: string; targetType: 'node' | 'edge' } }
  | { type: 'TOGGLE_PLUGIN_GROUP_DISABLED'; payload: { groupId: string; disabled: boolean } }
  | { type: 'TOGGLE_PLUGIN_SECTION_DISABLED'; payload: { pluginId: string; disabled: boolean } }
  | { type: 'PICK_GROUP_IMAGE'; payload: { groupId: string } }
  | { type: 'UPDATE_FOLDER_NODE_COLOR'; payload: { folderNodeColor: string } }
  | { type: 'UPDATE_DAG_MODE'; payload: { dagMode: DagMode } }
  | { type: 'UPDATE_NODE_SIZE_MODE'; payload: { nodeSizeMode: NodeSizeMode } };

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

/** Default color for folder nodes in Folder View. Same as DEFAULT_NODE_COLOR. */
export const DEFAULT_FOLDER_NODE_COLOR = '#A1A1AA';

/** Default color for direction indicators (arrows/particles). */
export const DEFAULT_DIRECTION_COLOR = '#475569';

/** Validates and normalizes a hex color string, returning the default if invalid. */
export function normalizeHexColor(value: string | undefined, defaultColor: string): string {
  if (!value) return defaultColor;
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  return defaultColor;
}

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
