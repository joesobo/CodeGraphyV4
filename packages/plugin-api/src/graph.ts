/**
 * @fileoverview Semantic graph data types for CodeGraphy Core.
 * @module @codegraphy-dev/plugin-api/graph
 */

export type CoreNodeType = 'file' | 'folder' | 'package' | 'symbol' | 'variable';

export type NodeType = CoreNodeType | (string & {});

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

  /** Human-readable node label. @example 'Button.tsx' */
  label: string;

  /** File size in bytes when known. */
  fileSize?: number;

  /** Semantic node category. */
  nodeType?: NodeType;

  /** Symbol metadata when this node represents a code symbol. */
  symbol?: IGraphNodeSymbolMetadata;

  /** Optional scalar plugin metadata for queries and exports. */
  metadata?: GraphMetadata;

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

  /** Human-readable source label. */
  label: string;

  /** Optional relation variant when sourceId alone is not unique enough. */
  variant?: string;

  /** Optional scalar source metadata. */
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

  /** Optional scalar plugin metadata for queries and exports. */
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
