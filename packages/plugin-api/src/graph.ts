/**
 * @fileoverview Graph data types for CodeGraphy visualization.
 * @module @codegraphy/plugin-api/graph
 */

/**
 * Represents a node in the dependency graph.
 * Each node corresponds to a file in the codebase.
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

  /** Whether this node is marked as a favorite. */
  favorite?: boolean;

  /** File size in bytes. Used for 'file-size' node sizing mode. */
  fileSize?: number;

  /**
   * Number of times this file has been opened.
   * Used for 'access-count' node sizing mode.
   */
  accessCount?: number;

  /**
   * Distance from the focused node in the depth graph view.
   * 0 = the focused node, 1 = direct neighbors, 2 = two hops away, etc.
   */
  depthLevel?: number;
}

/**
 * Represents a directed edge (connection) between two nodes.
 * Edges represent import relationships where the source file imports the target.
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
   */
  ruleId?: string;
}

/**
 * Complete graph data structure containing all nodes and edges.
 */
export interface IGraphData {
  /** Array of all nodes (files) in the graph */
  nodes: IGraphNode[];
  /** Array of all edges (imports) in the graph */
  edges: IGraphEdge[];
}
