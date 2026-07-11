/**
 * @fileoverview Graph data types for CodeGraphy visualization.
 * @module @codegraphy-dev/plugin-api/graph
 */

export type CoreNodeType = 'file' | 'folder' | 'package' | 'symbol' | 'variable';

export type NodeType = CoreNodeType | (string & {});

export type GraphNodeShape2D =
  | 'circle'
  | 'square'
  | 'rectangle'
  | 'diamond'
  | 'triangle'
  | 'hexagon'
  | 'star';

export type CoreEdgeKind =
  | 'nests'
  | 'include'
  | 'import'
  | 'using'
  | 'type-import'
  | 'type'
  | 'call'
  | 'inherit'
  | 'implements'
  | 'event'
  | 'reference'
  | 'load'
  | 'contains'
  | 'overrides';

export type GraphEdgeKind = CoreEdgeKind | `${string}:${string}`;

export type GraphMetadataValue = string | number | boolean | null;

export type GraphMetadata = Record<string, GraphMetadataValue>;

export interface IGraphNodeRange {
  startLine: number;
  startColumn?: number;
  endLine: number;
  endColumn?: number;
}

export interface IGraphNodeSymbolMetadata {
  id: string;
  name: string;
  kind: string;
  filePath: string;
  pluginKind?: string;
  range?: IGraphNodeRange;
  signature?: string;
  language?: string;
  source?: string;
}

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

  /** Number of Git history touches used for 'churn' node sizing mode. */
  churn?: number;

  /**
   * Distance from the focused node when depth mode is active.
   * 0 = the focused node, 1 = direct neighbors, 2 = two hops away, etc.
   */
  depthLevel?: number;

  /** Semantic node category used by the graph UI. */
  nodeType?: NodeType;

  /** Optional 2D shape override for the node. */
  shape2D?: GraphNodeShape2D;

  /** Optional 2D visual size override. Width and height are graph-space units centered on the node. */
  shapeSize2D?: {
    height: number;
    width: number;
  };

  /** Optional 2D corner radius for rectangle nodes, in graph-space units. */
  cornerRadius2D?: number;

  /**
   * Optional 2D collision radius override for physics. This is useful when a plugin renders
   * a custom shape but owns its own collision or containment behavior.
   */
  collisionRadius2D?: number;

  /**
   * Optional multiplier for the 2D charge force. Use 0 when a plugin owns local physics for
   * a runtime node or projected member node.
   */
  chargeStrengthMultiplier2D?: number;

  /** Optional 2D fill opacity override for custom visual nodes. */
  fillOpacity2D?: number;

  /** Optional 2D pointer hit area override. Width and height are graph-space units centered on the node. */
  pointerArea2D?: {
    height: number;
    width: number;
  };

  /** Optional image override for the node. */
  imageUrl?: string;

  /** Symbol metadata when this node represents a code symbol. */
  symbol?: IGraphNodeSymbolMetadata;

  /** Optional plugin presentation metadata for details, popups, exports, and filters. */
  metadata?: GraphMetadata;

  /** Whether this folder-like node can collapse descendant nodes in the graph view. */
  isCollapsible?: boolean;

  /** Whether this folder-like node currently represents hidden descendant nodes. */
  isCollapsed?: boolean;

  /** Number of currently hidden descendant nodes represented by this collapsed node. */
  collapsedDescendantCount?: number;
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

  /** Plugin-local source identifier used for provenance, exports, and diagnostics. */
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

  /** Optional color override resolved by graph controls and legends. */
  color?: string;

  /** All contributing plugin sources merged into this edge. */
  sources: IGraphEdgeSource[];

  /** Optional plugin presentation metadata for details, popups, exports, and filters. */
  metadata?: GraphMetadata;
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
