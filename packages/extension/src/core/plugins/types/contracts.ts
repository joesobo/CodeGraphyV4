/**
 * @fileoverview Extension-side bridge to the canonical plugin API contracts.
 * @module core/plugins/types/contracts
 */

export type {
  CodeGraphyAPI,
  CoreEdgeKind,
  GraphEdgeKind,
  GraphMetadata,
  GraphMetadataValue,
  GraphNodeShape2D,
  GraphNodeShape3D,
  IAnalysisFile,
  IConnection,
  IConnectionDetector,
  IConnectionSource,
  IGraphData,
  IGraphEdge,
  IGraphEdgeSource,
  IGraphNode,
  IPlugin,
  IPluginFileColorDefinition,
  NodeType,
} from '../../../../../plugin-api/src/contract';

/**
 * Information about a registered plugin.
 */
export interface IPluginInfo {
  /** The plugin instance */
  plugin: import('../../../../../plugin-api/src/contract').IPlugin;
  /** Whether this is a built-in plugin */
  builtIn: boolean;
  /** Source extension ID for community plugins */
  sourceExtension?: string;
}
