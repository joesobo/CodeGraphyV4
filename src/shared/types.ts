/**
 * Shared types between extension and webview
 */

// ============================================================================
// File Data (internal representation, what plugins will produce)
// ============================================================================

export interface IFileData {
  /** Full file path - acts as unique identifier */
  path: string;
  /** Filename for display */
  name: string;
  /** File extension (e.g., '.ts', '.tsx', '.js') */
  extension: string;
  /** Paths of files this file imports */
  imports: string[];
}

// ============================================================================
// Graph Data (for Vis Network rendering)
// ============================================================================

export interface IGraphNode {
  /** Unique identifier (file path) */
  id: string;
  /** Display label (filename) */
  label: string;
  /** Node color (derived from file extension) */
  color: string;
  /** Persisted X position */
  x?: number;
  /** Persisted Y position */
  y?: number;
}

export interface IGraphEdge {
  /** Unique edge identifier (format: "fromPath->toPath") */
  id: string;
  /** Source node ID (file path) */
  from: string;
  /** Target node ID (file path) */
  to: string;
}

export interface IGraphData {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
}

// ============================================================================
// Message Protocol (Extension <-> Webview)
// ============================================================================

/** Messages from Extension to Webview */
export type ExtensionToWebviewMessage =
  | { type: 'GRAPH_DATA_UPDATED'; payload: IGraphData };

/** Messages from Webview to Extension */
export type WebviewToExtensionMessage =
  | { type: 'NODE_SELECTED'; payload: { nodeId: string } }
  | { type: 'NODE_DOUBLE_CLICKED'; payload: { nodeId: string } }
  | { type: 'NODE_POSITION_CHANGED'; payload: { nodeId: string; x: number; y: number } }
  | { type: 'WEBVIEW_READY'; payload: null };

// ============================================================================
// File Type Colors
// ============================================================================

export const FILE_TYPE_COLORS: Record<string, string> = {
  '.ts': '#3B82F6',    // Blue
  '.tsx': '#06B6D4',   // Cyan
  '.js': '#EAB308',    // Yellow
  '.jsx': '#F59E0B',   // Amber
  '.css': '#EC4899',   // Pink
  '.scss': '#D946EF',  // Magenta
  '.json': '#22C55E',  // Green
  '.md': '#6B7280',    // Gray
  '.html': '#F97316',  // Orange
  '.svg': '#8B5CF6',   // Purple
};

export const DEFAULT_NODE_COLOR = '#64748B'; // Slate

/**
 * Get color for a file based on its extension
 */
export function getFileColor(extension: string): string {
  return FILE_TYPE_COLORS[extension.toLowerCase()] ?? DEFAULT_NODE_COLOR;
}
