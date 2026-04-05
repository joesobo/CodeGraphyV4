/**
 * @fileoverview Graph data types for CodeGraphy visualization.
 * @module @codegraphy-vscode/plugin-api/graph
 */

export type NodeType = 'file' | 'folder';

export type GraphNodeShape2D =
  | 'circle'
  | 'square'
  | 'diamond'
  | 'triangle'
  | 'hexagon'
  | 'star';

export type GraphNodeShape3D =
  | 'sphere'
  | 'cube'
  | 'octahedron'
  | 'cone'
  | 'dodecahedron'
  | 'icosahedron';

export type CoreEdgeKind =
  | 'import'
  | 'reexport'
  | 'call'
  | 'inherit'
  | 'reference'
  | 'test'
  | 'load';

export type GraphEdgeKind = CoreEdgeKind | `${string}:${string}`;

export type GraphMetadataValue = string | number | boolean | null;

export type GraphMetadata = Record<string, GraphMetadataValue>;

/**
 * Represents a node in the dependency graph.
 * Each node corresponds to a file or folder in the codebase.
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

  /** Semantic node category used by the graph UI. */
  nodeType?: NodeType;

  /** Optional 2D shape override for the node. */
  shape2D?: GraphNodeShape2D;

  /** Optional 3D shape override for the node. */
  shape3D?: GraphNodeShape3D;

  /** Optional image override for the node. */
  imageUrl?: string;
}

/**
 * Provenance for one contributing plugin relation on a merged graph edge.
 */
export interface IGraphEdgeSource {
  /**
   * Stable qualified source identifier.
   * Recommended format: "<pluginId>:<sourceId>"
   */
  id: string;

  /** Plugin that contributed this source. */
  pluginId: string;

  /** Plugin-local source identifier used for toggles and diagnostics. */
  sourceId: string;

  /** Human-readable label shown in inspectors, menus, and exports. */
  label: string;

  /** Optional relation variant when sourceId alone is not unique enough. */
  variant?: string;

  /** Optional display/query metadata. Must stay scalar-only. */
  metadata?: GraphMetadata;
}

/**
 * Represents a directed edge (connection) between two nodes.
 * Edges are merged by direction and kind. Provenance lives in `sources`.
 */
export interface IGraphEdge {
  /**
   * Unique merged edge identifier.
   * Recommended format: "fromPath->toPath#kind"
   * @example 'src/App.tsx->src/Button.tsx#import'
   */
  id: string;

  /**
   * Source node ID.
   * @example 'src/App.tsx'
   */
  from: string;

  /**
   * Target node ID.
   * @example 'src/Button.tsx'
   */
  to: string;

  /** Semantic meaning of the connection. */
  kind: GraphEdgeKind;

  /** All contributing plugin sources merged into this edge. */
  sources: IGraphEdgeSource[];
}

/**
 * Complete graph data structure containing all nodes and edges.
 */
export interface IGraphData {
  /** Array of all nodes in the graph. */
  nodes: IGraphNode[];
  /** Array of all merged edges in the graph. */
  edges: IGraphEdge[];
}
